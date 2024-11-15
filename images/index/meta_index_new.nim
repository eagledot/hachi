# idea is to start writing a new nim backend for meta-index

# start with int and string.
# main ideas:
# supposed to be like  a table.
# but column oriented. (with the idea of finding matching attribute value, by quickly scanning that column exhaustively)
# first iteration is supposed to just return the indices for matching values (not values itself)
# may be in next iteration we collect the values in Nim memory or in python  memory!

# TODO: prevent uninitialized .. 
# create a example config.nim and save it somewhere.. for reference.


# we will attach a single Fuzzy Index/malhar on the python side directly.
# this is supposed to be simple metaindex to store (attribute, value) pairs


import std/json
import sequtils

######################################################
# compatible to nim string.(for most of use cases.) terminated by zero/null, sequence of bytes.. len gives us the number of bytes, not UNICODE points or any encoding for that matter.
#####################################################
type
  MyString = object
    payload:ptr UncheckedArray[char]
    len:Natural
proc `=copy`(a: var MyString, b:MyString) {.error.}
# proc `=sink`(a: var MyString; b: MyString) {.error.}

proc toMystring(s:string):MyString=
  # Note that string is just  a sequence of bytes in Nim(unless we associate a specific encoding with it)
  # this makes it easy while leveraging the raw-bytes. Note: len field give us the number of bytes , not UNICODE points/bytes.
  result.payload = cast[ptr UncheckedArray[char]](alloc0(s.len + 1)) # since Nim strings are null/0 terminated.
  result.payload[s.len] = '\0'   # shouldn't need this we are zeroing memory using alloc0 !
  result.len = s.len
  return result

proc `[]`(s:MyString, index:int):char =
  assert index >= 0 and index <= s.len
  return s.payload[index]

#########################################
# Columns for our database/table
########################################
type
  colType = enum
    colString
    colInt32
    #colFloat32

# good enough, start from here.. i guess
# i think serialization should be easy .. if we decide to put a column on disk, and later read that column.
type
  Column = object
    # lock : i think it is easier to add a dedicated lock for each column, in future to coordinate read/write to and from a specific column.
    # i.e we may not want to lock the the whole metaIndex when writing to a single column is done right! 
    # but have to figure out a lot of things/theory.. just here to remind me!
    # not writing a production database or something.. but yeah can choose to experiments like keeping a big column on disk on-demand and stuff like that!
    kind:colType
    
    # allocate enough memory for payload during metaIndex initialization!
    payload:pointer = nil  # packed array of int32/MyString/float32. (condition on the type field, we can know which) and using size to know the number of values/elements. 
    immutable:bool = true  # can be set selectively for equivalent of a primarykey or foreign key !
    label:string

proc add_int32(c:var Column, row_idx:Natural, data:int32)=
  # add data to the columns, 
  # but how..
  # what we need to do ?
  # then what?

  # get the data for the addr.
  assert c.kind == colInt32
  assert not isNil(c.payload)
  
  var arr = cast[ptr UncheckedArray[int32]](c.payload)
  arr[row_idx] = data

proc add_string(c:var Column, row_idx:Natural, data:string)=
  # NOTE: row_idx is supposed to be a valid as MetaIndex is supposed to verify the index accesses!
  # TODO: still can store max_offset like field in column to prevent invalid access at userspace level!
  
  assert not isNil(c.payload)
  assert c.kind == colString

  var arr = cast[ptr UncheckedArray[MyString]](c.payload)
  arr[row_idx] = toMyString(data)


###############################################################################
##  modifiy data API #####
################################################################################
# NOTE: metaIndex (parent) is supposed to prevent invalid row_idx !
proc modify_int32(c:Column, row_idx:Natural, data:int32)=
  doAssert c.immutable == false, "Column: " & c.label & "is not mutable!"
  doAssert c.kind == colInt32
    
  let arr = cast[ptr UncheckedArray[int32]](c.payload)
  arr[row_idx] = data

proc modify_string(c:Column, row_idx:Natural, data:string)=
  doAssert c.immutable == false, "Column: " & $c.label & "is not mutable!"
  doAssert c.kind == colString
  
  var new_data = toMyString(data)
  let arr = cast[ptr UncheckedArray[MyString]](c.payload)
  arr[row_idx] = new_data
######################################################################################
# preventing raw pointers copy, either do this or create a reference (Tracked pointer) to move this column object freely and let gc insert destructor call!
proc `=copy`(a: var Column; b: Column) {.error.}
proc `=sink`(a: var Column; b: Column) {.error.}    

########################################################################################
##  Front-end for accessing columns, all access goes through it. Responsible of syncing and locking mechanisms..to  handle concurrent read/writes !
##################################################################################

# it supports adding/appending a new/fresh row, modifying an existing row/column, invalidating an existing row (not individual column) later!
# any addition and deletion is done at row level, not column.
# but modification(restricted) is available at [row, column] level...
type
  MetaIndex = object
    capacity:Natural          # max number of elements/data for each column. (have to set during initialization)
    name:string               # a name for the meta index (just to identify easily, not required though !)
    columns:seq[Column] = @[]      # sequence of columns, easier to add a new column if schema changes !
    
    # syncing/locking
    rowPointer:Natural = 0           # points to the row index which would be appended/added next. 
    fieldsCache:seq[string]           # keeps temporary account of which fields/columns have been updated..so that we know all fields for a fresh row are there.
    rowWriteInProgress:bool = false   # indicates if a row writing in progress, in case we add data column by column, and not add whole row at once  
    # locks:seq[something]            # a lock for each of the column to provide concurrent reading/writing if independent columns are request by different clients!

proc init(name:string, column_labels:varargs[string], column_types:varargs[colType], capacity:Natural = 1_000):MetaIndex=
  # initialize the metaIndex based on the labels/column-names.
  # column_types: corresponding type for data being stored in each column.
  # note of python, we would create a  mapping from string to colType.
  # in the end it becomes the problem of correct syncing .. if i update at one place ?

  # TODO: a mapping from the label to the index in the columns sequence.
  # so to quickly get the corresponding column.
  
  var count:int = 0
  doAssert len(column_labels) == len(column_types)
  for i in 0..<len(column_labels):
    let column_label = column_labels[i]
    let column_type = column_types[i]
    if column_type ==  colString:
        var column = Column(kind:colString, label:column_label)  
        column.payload = alloc0(capacity * sizeof(MyString))
        result.columns.add(column)
    elif column_type == colInt32:
        var column = Column(kind:colInt32, label:column_label)
        column.payload = alloc0(capacity * sizeof(int32))
        result.columns.add(column)
    else:
      # TODO: unreachable.. i.e induce error on this branch!
      discard
    result.name = name
    result.capacity = capacity
    return result

proc rowWriteStart(m:var MetaIndex)=
  # TODO: later may be acquire lock here..
  doAssert m.rowWriteInProgress == false, "expected to be false!"
  m.fieldsCache = @[]    # empty the field cache.
  m.rowWriteInProgress = true

proc rowWriteEnd(m:var MetaIndex)=
  # TODO: later may be release lock in here..
  doAssert m.rowWriteInProgress == true, "expected to be true!"

  # sanity check to make sure all the fields are written for this row!
  for c in m.columns:
    doAssert c.label in m.fieldsCache

  m.rowPointer += 1      
  m.rowWriteInProgress = false

proc add[T:int32 | string](m:MetaIndex, column_index:Natural, column_data:T)=
  # appends a new value/element to the column, In case we want to complete the current row, by appending one column at a time.
  
  doAssert m.rowWriteInProgress == true, "expected to be true, call rowWriteStart first!"
  
  var column = m.columns[column_index] # here it would try to copy right temporarily !
  if typedesc(column_data) is int32:
    column.add_int32(column_data)
  elif typedesc(column_data) is string:
    column.add_string(column_data)
  else:
    doAssert 1 == 0, "not expected, check your branching logic!"
  
  m.fieldsCache.add(column.label)  # indicates that a  particular field has been appended. so that at the end we can tally!

proc add[T:int32|string](m:MetaIndex, column_label:string, column_data:T)=
  # append a new value/element to the column. (in case we want to complete current row by appending one value at a time)
  let column_index = 0     # TODO
  m.add(column_index, column_data)

proc add_row(m:var MetaIndex, column_data:JsonNode)=
  # to append  a fresh row in single go..i think there is only one way to do with if columns are heterogenous.
  # resort to a serialized form, either custom or something like protobuf or Json.
  # Json is easier to read and also machine parseable. (have implementations in every language!)

  # indicate rowWrite in progress..
  m.rowWriteStart()
  let curr_row_idx = m.rowPointer
    
  assert column_data.kind == JObject
  # check that all keys are available.
  for i in 0..<len(m.columns):
    # each key is either supposed to be num or string. (later when float32 may be fnum) 
    var c{.cursor.} = m.columns[i]     # temporary borrow !
    let key = c.label

    # TODO: indicate in one go if there are missing keys or any extra keys !
    doAssert column_data.hasKey(key), "Expected key: " & $key
    let value = column_data[key]

    # only string and int data is allowed.. (TODO: how to keep it in sync with colData !)
    if value.kind == JInt:
      c.add_int32(row_idx = curr_row_idx, data = getInt(value).int32)
    elif value.kind == JString:
      c.add_string(row_idx = curr_row_idx, data = getStr(value))
    else:
      doAssert 1 == 0, "Unexpected value of type: "  & $value.kind 

    m.fieldsCache.add(c.label)  # at the end, tallied to make sure all the fields have been updated for this row.

  # following is also supposed to do sanity checks.
  m.rowWriteEnd()


proc set_immutable()=
  # can set a  particular column to be immutable, but not vice-versa!
  discard

proc query_indices(attribute:string, value:string)=
  # idea is that.. value can be None.
  # then all possible attributes/lables would be returned.
  # otherwise attribute/label and value pair must be provided.
  # and we return a sequence of 
  # we are supposed to return the number f 
  discard


# how the example would look like.
# init MetaIndex.
# some Json data
# add_row()
# 

when isMainModule:
  let
    hisName = "name"
    herAge:int32 = 43

  # supposed to create JsonNode easily. 
  var j = %*
    [
      { "name": hisName, "age": 30 },
      { "name": "Susan", "age": herAge }
    ]

  echo typeof(j)  # JsonNode
  echo repr(j)
  
  
  var j2 = %* {"name": "Isaac", "books": ["Robot Dreams"]}
  j2["details"] = %* {"age":35, "pi":3.1415}
  echo j2

  var j3 = %* {"name":"nain", "age":30}
  var m = init(name = "test", column_labels = ["age", "name"], column_types = [colInt32, colString])
  
  
  m.add_row(column_data = j3)
  echo m.rowPointer
