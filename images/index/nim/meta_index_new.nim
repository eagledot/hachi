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


# NOTES:
# the point is that if i don't overwrite the data (unless very explicitly specified by parent MetaIndex),
# we don't need to worry about overwriting/buggy-writes (as lmbd uses this principle), right.
# then just we can move the pointers around, as asssuming all data collected is valid/required !
# 

# TODO: 64 bit aligned pointer during allocation !

import std/json
import strutils
import std/tables

######################################################
# compatible to nim string.(for most of use cases.) terminated by zero/null, sequence of bytes.. len gives us the number of bytes, not UNICODE points or any encoding for that matter.
#####################################################
# may be i can use original (Nim) String here.. but don't want to mix the gc and ptr memory, as may have to reason every time !
# also pointer/raw-memory is easierl to pass among threads without worrying about GC effects! 
# type
#   MyString = object
#     payload:ptr UncheckedArray[char]
#     len:Natural


# proc `=copy`(a: var MyString, b:MyString) {.error.}
# # proc `=sink`(a: var MyString; b: MyString) {.error.}    # sink also include `destroy/wasMoved` for a, so if not inferred correctly could loose resources'. Instead do it manually.(field by field when needed)

# proc `=destroy`(a:MyString)=
#   # NOTE: if sink is not set to error, provide a destroy routine must.. as sink would call it..(for manual memory it is must)
#   # echo "string is being destroyed!"
#   if not isNil(a.payload):
#     dealloc(a.payload)
  

# proc toMystring(s:string):MyString=
#   # Note that string is just  a sequence of bytes in Nim(unless we associate a specific encoding with it)
#   # this makes it easy while leveraging the raw-bytes. Note: len field give us the number of bytes , not UNICODE points/bytes.
#   result.payload = cast[ptr UncheckedArray[char]](alloc0(s.len + 1)) # since Nim strings are null/0 terminated.
#   for i in 0..<s.len:
#     result.payload[i] = s[i]
#   result.payload[s.len] = '\0'   # shouldn't need this we are zeroing memory using alloc0 !
#   result.len = s.len
#   return result

# proc fromMyString(s:MyString):string=
#   doAssert not isNil(s.payload)
#   result = $(cast[cstring](s.payload))
#   return result

# proc `[]`(s:MyString, index:int):char =
#   assert index >= 0 and index <= s.len
#   return s.payload[index]

#########################################
# Columns for our database/table
########################################
type
  colType* = enum
    colString
    colInt32      # to handle int values..
    colFloat32    # to handle float values..
    colBool       # to handle boolean values..
    # colNull # donot want it not for now..?

# trying to support aliasing
# we create a new version for a value in column, when user wants to modify it.
# note we can support only one extra version..
type
  ColumnAlias = object
    capacity:Natural
    counter:Natural
    row_indices:ptr UncheckedArray[Natural] # in case to help us ... which of the rows in a column have been aliased !
    payload:pointer                  # column using this would know the payload type. # then based on matched.. we can collect the alias

proc `=copy`(a:var ColumnAlias, b:ColumnAlias) {.error.}
proc `=sink`(a:var ColumnAlias, b:ColumnAlias) {.error.}

# good enough, start from here.. i guess
# i think serialization should be easy .. if we decide to put a column on disk, and later read that column.
type
  ColumnObj = object
    # lock : i think it is easier to add a dedicated lock for each column, in future to coordinate read/write to and from a specific column.
    # i.e we may not want to lock the the whole metaIndex when writing to a single column is done right! 
    # but have to figure out a lot of things/theory.. just here to remind me!
    # not writing a production database or something.. but yeah can choose to experiments like keeping a big column on disk on-demand and stuff like that!
    kind*:colType
    
    # allocate enough memory for payload during metaIndex initialization!
    payload:pointer = nil  # packed array of int32/MyString/float32. (condition on the type field, we can know which) and using size to know the number of values/elements. 
    immutable:bool = false  # can be set selectively for equivalent of a primarykey or foreign key !
    label*:string

    # alias
    aliased:bool = false   # this we can use to condition on if we need to search alias version too..
    alias:ColumnAlias


proc `=copy`(a:var ColumnObj, b:ColumnObj) {.error.}
proc `=sink`(a:var ColumnObj, b:ColumnObj) {.error.}

type Column = ref ColumnObj

proc checkAlias[T](c:Column):Table[Natural, T]=
  if c.aliased:  
    for ix in 0..<c.alias.counter:
      let key = c.alias.row_indices[ix]
      let value = cast[ptr UncheckedArray[T]](c.alias.payload)[ix]
      result[key] = value        # we keep overwriting, as latest version would be in the last for each key!
  return result

proc toJson(c:Column, limit:Natural, split:bool = false, splitter:string = "|"):JsonNode =
  # JArray
  # assuming that it would be easier to print a JsonNode.

  # ignore split, splitter only to be used to strings.. making it a bit easier to return expected array of strings...
  # otherwise have to do it more place too..


  result = JsonNode(kind:JArray)

  if c.kind == colString:
    let alias_table = checkAlias[string](c)
    let temp = cast[ptr UncheckedArray[string]](c.payload)
    for i in 0..<limit:
      var value = temp[i]
      if alias_table.hasKey(i):
        value = alias_table[i]

      if split == true and value.contains(splitter): # generally parent can supply this.. for easy access to all value actually user indexeD!
        # NOTE: it kind of flats the column... in case some rows had "value<splitter>value".. for easy access for unique values!!!
        for v_s in value.split(splitter):
          result.add(JsonNode(kind:Jstring, str:v_s))
      else:
        result.add(JsonNode(kind:JString, str:value))
      
  elif c.kind == colInt32:
    let alias_table = checkAlias[int32](c)
    let temp = cast[ptr UncheckedArray[int32]](c.payload)
    for i in 0..<limit:
      var value = temp[i]
      if alias_table.hasKey(i):
        value = alias_table[i]
      result.elems.add(JsonNode(kind:JInt, num:BiggestInt(value)))

  elif c.kind == colBool:
    let alias_table = checkAlias[bool](c)
    let temp = cast[ptr UncheckedArray[bool]](c.payload)
    for i in 0..<limit:
      var value = temp[i]
      if alias_table.hasKey(i):
        value = alias_table[i]
      result.elems.add(JsonNode(kind:JBool, bval:bool(value)))
  
  elif c.kind == colFloat32:
    let alias_table = checkAlias[float32](c)
    let temp = cast[ptr UncheckedArray[float32]](c.payload)
    for i in 0..<limit:
      var value = temp[i]
      if alias_table.hasKey(i):
        value = alias_table[i]
      result.elems.add(JsonNode(kind:JFloat, fnum:value))

  else:
    doAssert 1 == 0, "not expected"
  
  return result

template aliasImpl(c_t:var Column, row_idx_t:Natural, data_t:typed, type_t:typedesc)=
  # i think it can model any number of versions/revisions.. since we are always appending.
  # we can then scan and find the row indices if repeated more than it represents different versions..
  let temp_payload = c_t.alias.payload
  if isNil(temp_payload):
    # initializing alias..
    let capacity = 1000
    c_t.alias.payload = alloc0(capacity * sizeof(type_t))
    c_t.alias.row_indices = cast[ptr UncheckedArray[Natural]](alloc0(capacity * sizeof(Natural)))
    c_t.alias.counter = 0
    c_t.alias.capacity = capacity
  else:
    assert c_t.aliased == true, "expected this to be true..."
    if c_t.alias.counter >= c_t.alias.capacity:
      let old_capacity = c_t.alias.capacity

      # reallocation of resources...
      let new_capacity = old_capacity * 2
      let temp = alloc0(new_capacity * sizeof(type_t))
      copyMem(temp, temp_payload, old_capacity*sizeof(type_t)) # realloc.
      dealloc(temp_payload) # free resources.

      let temp_new = alloc0(new_capacity * sizeof(Natural))
      copyMem(temp_new, c_t.alias.row_indices, old_capacity*sizeof(Natural))
      dealloc(temp_new) # free resources..
      
      # update
      c_t.alias.payload = temp
      c_t.alias.capacity = new_capacity

  # add alias for provided row_idx..
  # we update both the new data, and corresponding row for which this data is being aliased to..
  let counter = c_t.alias.counter
  let arr = cast[ptr UncheckedArray[type_t]](c_t.alias.payload)

  # echo "adding....", data_t
  arr[counter] = data_t
  # echo arr[counter]


  c_t.alias.row_indices[counter] = row_idx_t  # add which 
  inc c_t.alias.counter
  c_t.aliased = true
    
proc add_int32(c:var Column, row_idx:Natural, data:int32, aliasing:bool = false)=

  if aliasing == true:
    aliasImpl(c, row_idx, data, int32)
    c.immutable = true
  else:
    assert c.kind == colInt32
    assert not isNil(c.payload)
    var arr = cast[ptr UncheckedArray[int32]](c.payload)
    arr[row_idx] = data

proc add_string(c:var Column, row_idx:Natural, data:string, aliasing:bool = false)=
  # NOTE: row_idx is supposed to be a valid as MetaIndex is supposed to verify the index accesses!
  # TODO: still can store max_offset like field in column to prevent invalid access at userspace level!
  
  if aliasing == true:
    echo "modifying string..."
    aliasImpl(c, row_idx, data, string)
  else:
    assert not isNil(c.payload)
    assert c.kind == colString

    var arr = cast[ptr UncheckedArray[string]](c.payload)
    arr[row_idx] = data

proc add_float32(c:var Column, row_idx:Natural, data:float32, aliasing:bool = false)=
  # NOTE: row_idx is supposed to be a valid as MetaIndex is supposed to verify the index accesses!
  # TODO: still can store max_offset like field in column to prevent invalid access at userspace level!
  
  # how to do aliasing..
  # allocate some memory 
  # add row_idx
  # add new value..
  if aliasing:
    # overwriting/modifying is being considered as aliasing..
    aliasImpl(c, row_idx, data, float32)
  else:
    assert not isNil(c.payload)
    assert c.kind == colFloat32
    var arr = cast[ptr UncheckedArray[float32]](c.payload)
    arr[row_idx] = data

proc add_bool(c:var Column, row_idx:Natural, data:bool, aliasing:bool = false)=
  # NOTE: row_idx is supposed to be a valid as MetaIndex is supposed to verify the index accesses!
  # TODO: still can store max_offset like field in column to prevent invalid access at userspace level!
  
  if aliasing:
    aliasImpl(c, row_idx, data, bool)
  else:
    assert not isNil(c.payload)
    assert c.kind == colBool, "got type: " & $c.kind
    var arr = cast[ptr UncheckedArray[bool]](c.payload)
    arr[row_idx] = data

###############################################################################
##  modifiy data API #####
################################################################################
# NOTE: metaIndex (parent) is supposed to prevent invalid row_idx !
proc modify_int32(c:var Column, row_idx:Natural, data:int32)=
  doAssert c.immutable == false, "Column: " & c.label & "is not mutable!"
  doAssert c.kind == colInt32
    
  let arr = cast[ptr UncheckedArray[int32]](c.payload)
  arr[row_idx] = data

proc modify_string(c:var Column, row_idx:Natural, data:string)=
  doAssert c.immutable == false, "Column: " & $c.label & "is not mutable!"
  doAssert c.kind == colString
  let arr = cast[ptr UncheckedArray[string]](c.payload)
  arr[row_idx] = data
  
  # let arr = cast[ptr UncheckedArray[MyString]](c.payload)
  # arr[row_idx] = ensureMove toMystring(data)
######################################################################################
# querying API (These must be as fast as possibly, currently OK, all optimizations should be focussed on faster queries)
#############################################################
template queryImpl(result_t: var seq[Natural], c_t:Column, query_t:typed, boundary_t, top_k_t:Natural, type_t:typedesc)=
  
  let alias_table = checkAlias[type_t](c_t)
  var count = 0
  let arr = cast[ptr UncheckedArray[type_t]](c_t.payload)
  for row_idx in 0..<boundary_t:
    if alias_table.hasKey(row_idx):
      if query_t == alias_table[row_idx]:
        result_t[count] = row_idx
        count += 1
    else:
      if arr[row_idx] == query_t:
        result_t[count] = row_idx
        count += 1
    
    if count == top_k:
      break 
  
  return result[0..<count]

template queryStringImpl(result_t: var seq[Natural], c_t:Column, query_t:string, boundary_t, top_k_t:Natural)=
  
  let alias_table = checkAlias[string](c_t)
  var count = 0
  let arr = cast[ptr UncheckedArray[string]](c_t.payload)
  for row_idx in 0..<boundary_t:

    # we search either in alias data or original data . i.e always latest version data..
    if alias_table.hasKey(row_idx):
      if alias_table[row_idx].contains(query_t):
        result_t[count] = row_idx
        count += 1
    else:
      if arr[row_idx].contains(query_t):
        result_t[count] = row_idx
        count += 1
    
    if count == top_k:
      break 
  
  return result[0..<count]

proc query_string(c:Column, query:string, boundary:Natural, top_k:Natural = 100):seq[Natural]=
  # returns the matching row indices in the 
  # boundary: is provided by MetaIndex, telling it how many elements are currently in this/all columns.
  
  # This matches substring(query) in strings, if match is found, we collect the corresponding index.
  # later actually merges this somehow with fuzzySearch, for now just roll with it!
  
  assert c.kind == colString
  
  let top_k = min(boundary, top_k)
  result = newSeq[Natural](top_k)
  queryStringImpl(result, c, query, boundary, top_k)





  # # returns all the matching row indices. MetaIndex can take care if some of them are invalid or stuff!
  # # for now just check if a substring in string, (i know brute-forcing... but hoping it would be good enough for 100k strings if only column has much larger string)
  # # try to make it work, later would add fuzzy search .. when have time...(have to port it from python ...sighhhhhhhh)
  # var count = 0   # to count the number of matches found  
  # let arr = cast[ptr UncheckedArray[string]](c.payload)
  # # exhaustive search but break when hit top_k.. for now all have same scores, so top_k doesn't make much sense !
  # for i in 0..<boundary:
  #   # TODO: may be can supply a pragma copy elision or something!    
  #   let data = arr[i]  # TODO: i think compiler can figure out to not copy the whole string.. as using it for read access only!
  #   if data.contains(query):
  #     result[count] = i
  #     count += 1
  #     if count == top_k:
  #       break
  # return result[0..<count]

proc query_int32(c:Column, query:int32, boundary:Natural, top_k:Natural = 100):seq[Natural]=
  assert c.kind == colInt32
  
  let top_k = min(boundary, top_k)
  result = newSeq[Natural](top_k) # allocate at once... 
  queryImpl(result, c, query, boundary, top_k, int32)
  
proc query_float32(c:Column, query:float32, boundary:Natural, top_k:Natural = 100):seq[Natural]=
  assert c.kind == colFloat32
  
  let top_k = min(boundary, top_k)
  result = newSeq[Natural](top_k) # allocate at once... 
  queryImpl(result, c, query, boundary, top_k, float32)

proc query_bool(c:Column, query:bool, boundary:Natural, top_k:Natural = 100):seq[Natural]=
  assert c.kind == colBool
  
  let top_k = min(boundary, top_k)
  result = newSeq[Natural](top_k) # allocate at once... 
  queryImpl(result, c, query, boundary, top_k, bool)

################################################################################################################

# preventing raw pointers copy, either do this or create a reference (Tracked pointer) to move this column object freely and let gc insert destructor call!
# proc `=copy`(a: var Column; b: Column) {.error.}
# proc `=sink`(a: var Column; b: Column) {.error.}    

########################################################################################
##  Front-end for accessing columns, all access goes through it. Responsible of syncing and locking mechanisms..to  handle concurrent read/writes !
##################################################################################

# it supports adding/appending a new/fresh row, modifying an existing row/column, invalidating an existing row (not individual column) later!
# any addition and deletion is done at row level, not column.
# but modification(restricted) is available at [row, column] level...
type
  MetaIndex* = object
    # append only, no deletion! 
    stringConcatenator:string = "|"                 # we may support multiple strings for colString columns, by concatenating into a single string using this string/character.
    # actual order/column-id should not matter, as long as we provide correct mapping. (i.e key must match with column label)
    fields:Table[string, Natural]  # mapping from the column's label to the id in the columns. (want it to be same even after loading from disk!)
    dbCapacity:Natural          # max number of elements/data for each column. (have to set during initialization)
    dbName:string               # a name for the meta index (just to identify easily, not required though !)
    
    # append only, no deletion. (just invalidation may be)
    columns*:seq[Column] = @[]      # sequence of columns, easier to add a new column if schema changes !
    
    # syncing/locking
    dbRowPointer:Natural = 0           # points to the row index which would be appended/added next. 
    fieldsCache:seq[string]           # keeps temporary account of which fields/columns have been updated..so that we know all fields for a fresh row are there.
    rowWriteInProgress:bool = false   # indicates if a row writing in progress, in case we add data column by column, and not add whole row at once  
    # locks:seq[something]            # a lock for each of the column to provide concurrent reading/writing if independent columns are request by different clients!


proc `=copy`(a:var MetaIndex, b:MetaIndex) {.error.}
# proc `=sink`(a:var MetaIndex, b:MetaIndex) {.error.}
# TODO: provide `=destroy`

const reserved_literals = ["dbName", "dbCapacity", "dbRowPointer"]

proc init*(name:string, column_labels:varargs[string], column_types:varargs[colType], capacity:Natural = 1_000, rowPointer:Natural = 0):MetaIndex=
  # initialize the metaIndex based on the labels/column-names.
  # column_types: corresponding type for data being stored in each column.
  # note of python, we would create a  mapping from string to colType.
  # in the end it becomes the problem of correct syncing .. if i update at one place ?

  # TODO: a mapping from the label to the index in the columns sequence.
  # so to quickly get the corresponding column.

  result = default(MetaIndex)
  var count:int = 0
  doAssert len(column_labels) == len(column_types)
  for i in 0..<len(column_labels):
    let column_label = column_labels[i]
    let column_type = column_types[i]
    doAssert not (column_label in reserved_literals), $column_label & "is reserved. Use a different label/identifier for column!"

    if column_type ==  colString:

        var column = new ColumnObj
        column.kind = colString
        column.label = column_label
        # column.payload = alloc0(capacity * sizeof(MyString))
        column.payload = alloc0(capacity * sizeof(string))
        result.columns.add(column)
    
    elif column_type == colInt32:

        var column = new ColumnObj
        column.kind = colInt32
        column.label = column_label
        column.payload = alloc0(capacity * sizeof(int32))
        result.columns.add(column)
    elif column_type == colFloat32:

        var column = new ColumnObj
        column.kind = colFloat32
        column.label = column_label
        column.payload = alloc0(capacity * sizeof(float32))
        result.columns.add(column)
    elif column_type == colBool:

        var column = new ColumnObj
        column.kind = colBool
        column.label = column_label
        column.payload = alloc0(capacity * sizeof(bool))
        result.columns.add(column)    
    else:
      # TODO: unreachable.. i.e induce error on this branch!
      discard

    doAssert result.fields.hasKey(column_label) == false, "Expected unique labels for columns! got: " & $column_label & " more than once! "
    result.fields[column_label] =  i   # save the mapping.

  result.dbName = name
  result.dbCapacity = capacity
  result.dbRowPointer = rowPointer
  return result

proc `[]`(m:MetaIndex, key:string):lent Column {.inline.} =
  # i think we have to use borrow semantics if want to return column like this for read purposes, as copy is prohibited !
  let idx = m.fields[key]
  result = m.columns[idx]
  assert result.label == key, "Expected " & $key & " but got: " & $result.label
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

  m.dbRowPointer += 1      
  m.rowWriteInProgress = false

template populateColumnImpl(c_t:var Column, row_idx_t:Natural, data_t:JsonNode, concatenator_t:string, aliasing_t:bool = false)=
  # populate a  column, given data as JsonNode.
  # NOTE: also supports flattened array of strings. Concatenated  into a single string using a separator like | and splitted into (original) strings, when collecting .
  # multiple strings allowed helps in one to many modelling situations like say multiple artists for a song (where song is a document/resource). 

  if data_t.kind == JInt:
    c_t.add_int32(row_idx = row_idx_t, getInt(data_t).int32, aliasing = aliasing_t)
  elif data_t.kind == JString:
    c_t.add_string(row_idx = row_idx_t, data = getStr(data_t), aliasing = aliasing_t)
  elif data_t.kind == JFloat:
    c_t.add_float32(row_idx = row_idx_t, data = getFloat(data_t).float32, aliasing = aliasing_t)
  elif data_t.kind == JBool:
    c_t.add_bool(row_idx = row_idx_t, data = getBool(data_t), aliasing = aliasing_t)
  elif data_t.kind == JArray:
    # we support array of string only at this point. (only one nesting level for strings.)
    # to enable one to many modelling.
    # but column is supposed to packed array of MyString type, so we create a single string from multiple strings.
    # using | character !
    
    var final_string = ""
    if len(data_t) > 0:
      doAssert data_t[0].kind == JString , "expected an array of strings for got: " & $data_t[0].kind
      final_string = getStr(data_t[0])
      doAssert not final_string.contains(concatenator_t), concatenator_t & " is reserved, we will add an option to ignor this..."  & final_string
      
      # we now split it conditioned on string Concatenator
      for json_data in data_t[1..<len(data_t)]:
        doAssert json_data.kind == JString
        let data_str = getStr(json_data)
        doAssert not data_str.contains(concatenator_t)
        final_string = final_string & concatenator_t  & data_str
    # echo "final string: ", final_string 
    c_t.add_string(row_idx = row_idx_t, data = final_string, aliasing = aliasing_t) 
  else:
    doAssert 1 == 0, "Unexpected data of type: "  & $data_t.kind 


proc add(m:var MetaIndex, column_label:string, data:JsonNode)=
  # appends a new value/element to the column, In case we want to complete the current row, by appending one column at a time.
  
  doAssert m.rowWriteInProgress == true, "expected to be true, call rowWriteStart first!"
  let curr_row_idx = m.dbRowPointer
  var column = m[column_label] # here it would try to copy right temporarily !
  populateColumnImpl(column, curr_row_idx, data, m.stringConcatenator)
  m.fieldsCache.add(column.label)  # indicates that a  particular field has been appended. so that at the end we can tally!

proc add_row*(m:var MetaIndex, column_data:JsonNode)=
  # TODO: support the JArray for fields, in case we want to store multiple strings for a field.
  # one to many modelling, (for string data atleast).
  # we can use | as the separator, to concatenate multiple strings together..
  # and later split to maintain the notion of muliple strings packed together!
  # idk what is the best solution but trying to make it work.
  
  # to append  a fresh row in single go..i think there is only one way to do with if columns are heterogenous.
  # resort to a serialized form, either custom or something like protobuf or Json.
  # Json is easier to read and also machine parseable. (have implementations in every language!)

  # indicate rowWrite in progress..
  m.rowWriteStart()
  let curr_row_idx = m.dbRowPointer

  # fill the matching column fields with the JsonData. (making sure no extra or missing keys)
  doAssert column_data.fields.len == m.fields.len , "Making sure no extra keys!"
  for key, id in m.fields:
    var c = m[key]  # get the corresponding column.
    let value = column_data[key]   # it makes sure all expected keys are available, i.e not missing keys
    populateColumnImpl(c, curr_row_idx, value, m.stringConcatenator)
    m.fieldsCache.add(c.label)  # at the end, tallied to make sure all the fields have been updated for this row.

  # following is also supposed to do sanity checks.
  m.rowWriteEnd()

proc modify_row*(m:var MetaIndex, row_idx:Natural, meta_data:JsonNode)=
  # a subset of fields to be modified with new data for given row.
  doAssert meta_data.kind == JObject
  for key, column_data in meta_data:
    echo "trying to modify: ", key
    var c = m[key]
    populateColumnImpl(c, row_idx, column_data, m.stringConcatenator, aliasing_t = true)

proc set_immutable()=
  # i am leaning towards aliasing rather than overwriting !
  # can set a  particular column to be immutable, but not vice-versa!
  discard

proc toJson(m:MetaIndex, count:Natural = 10):JsonNode =
  result = JsonNode(kind:JObject)
  let limit = min(m.dbRowPointer, count)
  for c in m.columns:
    result[c.label] = c.toJson(limit = limit)
  return result

proc `$`*(m:MetaIndex, count:Natural = 10):string=
  return m.toJson(count = count).pretty()

###################################
## Querying #######################
######################################
proc query_string*(m:MetaIndex, attribute:string, query:string, top_k:Natural = 100):seq[Natural]=
  # return all the matching indices in a column referred to by the attribute/label.
  let c = m[attribute]  # get the column.
  result = c.query_string(query = query, boundary = m.dbRowPointer, top_k = top_k) # query the column for matching candidates.
  return result

proc query_int32*(m:MetaIndex, attribute:string, query:int32, top_k:Natural = 100):seq[Natural]=
  let c = m[attribute]
  result = c.query_int32(query= query, boundary = m.dbRowPointer, top_k = top_k)
  return result

proc query_float32*(m:MetaIndex, attribute:string, query:float32, top_k:Natural = 100):seq[Natural]=
  # return all the matching indices in a column referred to by the attribute/label.
  let c = m[attribute]  # get the column.
  result = c.query_float32(query = query, boundary = m.dbRowPointer, top_k = top_k) # query the column for matching candidates.
  return result

proc query_bool*(m:MetaIndex, attribute:string, query:bool, top_k:Natural = 100):seq[Natural]=
  # return all the matching indices in a column referred to by the attribute/label.
  let c = m[attribute]  # get the column.
  result = c.query_bool(query = query, boundary = m.dbRowPointer, top_k = top_k) # query the column for matching candidates.
  return result


# we would want to 
# search for an attribute/column.
# search another..
# do and or... or whatever with indices..
# our duty for now is to return matching indices for a column, if you more than one query for that column. (do it more than once ! for now)
# it is on user to do OR AND operations.. once done.. use a set of indices to collect the rows...
# optionally can specify the labels to collect a subset of rows.

proc collect_rows*(m:MetaIndex, indices:varargs[Natural]):JsonNode=
  # somehow find the desired indices/rows and then pass these to this routine to return an array.
  result = JsonNode(kind:JArray)
  for idx in indices:
    var result_temp = JsonNode(kind:JObject)
    for c in m.columns:
      if c.kind == colString:
        # let arr = cast[ptr UncheckedArray[MyString]](c.payload)
        # let data = fromMyString(arr[idx])

        let arr = cast[ptr UncheckedArray[string]](c.payload)
        let data = arr[idx]

        # if stringConcatenator was used, we split it using that.. to return the data as i expected, i.e a container of strings. 
        # we enforce that stringConcatenator is not present in string data when add_row is called, so if add was successful so would this !
        if data.contains(m.stringConcatenator):
          let new_node = JsonNode(kind:JArray)
          for temp_str in data.split(m.stringConcatenator):
            new_node.elems.add(JsonNode(kind:JString, str:temp_str))
          result_temp[c.label] = new_node
        else:
          # result_temp[c.label] = JsonNode(kind:JString, str: fromMyString(arr[idx]))
          result_temp[c.label] = JsonNode(kind:JString, str: data)

      elif c.kind == colInt32:
        let arr = cast[ptr UncheckedArray[int32]](c.payload)
        result_temp[c.label] = JsonNode(kind:JInt, num:BiggestInt(arr[idx]))

      elif c.kind == colFloat32:
        let arr = cast[ptr UncheckedArray[float32]](c.payload)
        result_temp[c.label] = JsonNode(kind:JFloat, fnum:float(arr[idx]))

      elif c.kind == colBool:
        let arr = cast[ptr UncheckedArray[bool]](c.payload)
        result_temp[c.label] = JsonNode(kind:JBool, bval:arr[idx])

      else:
        doAssert 1 == 0
    
    result.elems.add(result_temp)
  return result

 
proc save*(m:MetaIndex, path:string)=
  # save somehow this to to 
  # but what should should i save..
  # we can get a sjon

  # this contains all columns.. json data.
  var json_schema = m.toJson(count = m.dbRowPointer)

  # we populate all remaining fields too.. to enough to load later from persistent storage..
  json_schema["dbRowPointer"] = JsonNode(kind:JInt, num:BiggestInt(m.dbRowPointer)) 
  json_schema["dbName"] = JsonNode(kind:JString, str:m.dbName)
  json_schema["dbCapacity"] = JsonNode(kind:JInt, num:BiggestInt(m.dbCapacity))

  let write_data = $json_schema
  var f = open(path, fmWrite)   # string are just bytes and written as such in Nim. encoding may make sense at read-time but json module handles that! 
  f.write(write_data) 
  f.close()

proc load*(path:string):MetaIndex=
  # based on the path, we will load/generate a fresh MetaIndex.
  # how to load...

  let f = open(path, fmRead)
  let raw_data = f.readAll()
  f.close()
  var json_schema = parseJson(raw_data)
  assert json_schema.kind == JObject
  
  let
    capacity = getInt(json_schema["dbCapacity"]).Natural
    name = getStr(json_schema["dbName"])
    rowPointer = getInt(json_schema["dbRowPointer"]).Natural  

  # delete/pop redundant keys..
  json_schema.fields.del("dbCapacity")
  json_schema.fields.del("dbName")
  json_schema.fields.del("dbRowPointer")

  # TODO: assuming one to one dependence with from json kind to colkind..
  # we predict the colKind.. later can be more verbose/rigid.
  var column_labels:seq[string]
  var column_types:seq[colType]
  for k, column_json in json_schema:
    column_labels.add(k)


    doAssert column_json.kind == JArray, "each column is supposed to be an array of type str/int/float/bool"
    # assuming one to one mapping. (i think can have a hook, for easy to and fro conversion b/w json and column kind, later.. after some reading!)
    if column_json[0].kind == Jstring:
      column_types.add(colString)
    elif column_json[0].kind == JInt:
      column_types.add(colInt32)
    elif column_json[0].kind == JFloat:
      column_types.add(colFloat32)
    elif column_json[0].kind == JBool:
      column_types.add(colBool)
    else:
      doAssert 1 == 0, "unexpected type: "  & $column_json.kind
  
  result = ensureMove init(name = name, capacity = capacity, column_labels = column_labels, column_types = column_types)
  
  # populate row by row
  for row_idx in 0..<rowPointer:
    # populate column by column.
    result.rowWriteStart()
    for label in column_labels:
      result.add(label, json_schema[label][rowIdx])  
    result.rowWriteEnd()
    
  doAssert result.dbRowPointer == rowPointer , "expected: " & $result.dbRowPointer & " got: " & $rowPointer
  return result

proc get_all*(m:MetaIndex, label:string):JsonNode=
  # an array of string/float32/bool/int32
  result = m[label].toJson(limit = m.dbRowPointer, split = true, splitter = m.stringConcatenator)

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
  
  
  var j2 = %* {"name": "Isaac", "books": ["Robot Dreams"]}
  j2["details"] = %* {"age":35, "pi":3.1415}


  var j3 = %* {"name":"nain", "age":30}
  var m = init(name = "test", column_labels = ["age", "name"], column_types = [colInt32, colString])
  

  # adding some data/rows.
  m.add_row(column_data = j3)
  m.add_row(column_data = %* {"name":["anubafdasd","nain"], "age":21})
  echo m   # good enough for a preview !

  # then check if query is working
  # echo m.query_string(attribute = "name", query = "baf")
  # echo m.query_int32(attribute = "age", query = 31)

  
  # collect some rows, 
  echo m.collect_rows(indices = [Natural(1)])

  # modification
  #proc modify_row*(m:var MetaIndex, row_idx:Natural, meta_data:JsonNode)=
  m.modify_row(row_idx = 1, meta_data = %* {"age":33})
  # echo repr(m["age"])
  # echo repr(cast[ptr array[1, int32]](m["age"].alias.payload))
  # echo repr(cast[ptr array[1, Natural]](m["age"].alias.row_indices))

  m.modify_row(row_idx = 1, meta_data = %* {"name":"malcom"})
  echo m
  m.modify_row(row_idx = 1, meta_data = %* {"name":"tyson"})
  echo m

  # just simply revert to original data.
  # let x = m["name"]
  # x.aliased = false
  
  echo m.get_unique("name")







  # save
  m.save("./test_meta_save.json")

  # echo "written to disk !!"
  # var m2 = load("./test_meta_save.json")
  # echo "loaded from disk!!"
  # echo m2    


 
  # echo m.rowPointer

  # echo c.label

  # echo c.toJson(limit = 1)
  
  # echo m.toJson().pretty()
  # echo $m.toJson()

  # let serial_json = $m.toJson()
  # echo typeof(serial_json)
  # echo parseJson(serial_json)
