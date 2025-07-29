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

# TODO: could be a good testcase for newer data-structures i am developing!
# TODO: 64 bit aligned pointer during allocation !
# TODO: std lib json parsing/decoding is quite slow compared to faster implementations like jsony..switch to that..
# TODO: compression/de-duplication can be done.. after adding more tests and documentation!
# TODO: may be use an id/primary-key for quick checking if id is already in index  otherwise may have to write code on python side!

import std/json # may be use jsony
import strutils
import std/tables
import std/options
import os

import jsony

#########################################
# Columns for our database/table
########################################
type
  ColType* = enum
    colString
    colInt32      # to handle int values..
    colFloat32    # to handle float values..
    colBool       # to handle boolean values..
    colArrayString # for now it is just string with some `boundary` to split the individual elements, when needed.
    # colNull # donot want it not for now..?

type
  ColumnObj = object
    # lock : i think it is easier to add a dedicated lock for each column, in future to coordinate read/write to and from a specific column.
    # i.e we may not want to lock the the whole metaIndex when writing to a single column is done right! 
    # but have to figure out a lot of things/theory.. just here to remind me!
    # not writing a production database or something.. but yeah can choose to experiments like keeping a big column on disk on-demand and stuff like that!
    kind*:ColType
    
    # allocate enough memory for payload during metaIndex initialization!
    payload:pointer = nil  # packed array of int32/string/float32. (condition on the type field, we can know which) and using size to know the number of values/elements. 
    immutable:bool = false  # can be set selectively for equivalent of a primarykey or foreign key !
    label*:string

proc `=copy`(a:var ColumnObj, b:ColumnObj) {.error.}
proc `=sink`(a:var ColumnObj, b:ColumnObj) {.error.}

proc `=destroy`(c:var ColumnObj)=
  echo "[WARNING] XXXXXXXX find a way to add row count in column object, not freeeing GC memory!!!"
  
  # reset(c.alias)
  if not isNil(c.payload):
    if c.kind == colString:
      # deallocate GC allocate strings too..
      let arr = cast[ptr UncheckedArray[string]](c.payload)
      for i in 0..<1:  # TODO: how to get the number of strings/value stord.. only parent keeps it
        reset(arr[i])  # this is GC allocated.. we must free this by calling reset manually.
    
    dealloc(c.payload)
  
  c.payload = nil
  reset(c.label)

type Column = ref ColumnObj

const StringBoundary = "|"
type AllowedColumnTypes = int32 | float32 | string | bool | seq[string] # based on the ColType
proc `[]=`[T:AllowedColumnTypes](c:Column, idx:Natural, data:T)=
  # NOTE: IT does NOT check, if idx is within bounds, and can overwrite without any warning.
  # so supposed to be called from an auditable routine!
  when T is seq[string]:
    doAssert c.kind == colArrayString
    # For Now we store even the `Array of strings` as `single` string. (Will later revisit to better handle it!)
    var temp = ""
    for elem in data:
      if len(elem) > 0:
        temp = temp & elem & StringBoundary
    cast[ptr UncheckedArray[string]](c.payload)[idx] = temp
  elif T is string:
    doAssert c.kind == colString, "Got: " & $c.kind & " for: " & c.label
    cast[ptr UncheckedArray[T]](c.payload)[idx] = data 
  elif T is int32:
    doAssert c.kind == colInt32
    cast[ptr UncheckedArray[T]](c.payload)[idx] = data 
  elif T is float32:
    doAssert c.kind == colFloat32
    cast[ptr UncheckedArray[T]](c.payload)[idx] = data 
  else:
    doAssert c.kind == colBool
    cast[ptr UncheckedArray[T]](c.payload)[idx] = data 

# proc checkAlias[T](c:Column):Table[Natural, T]{.inline.}=
#   if c.aliased:  
#     for ix in 0..<c.alias.counter:
#       let key = c.alias.row_indices[ix]
#       let value = cast[ptr UncheckedArray[T]](c.alias.payload)[ix]
#       result[key] = value        # we keep overwriting, as latest version would be in the last for each key!
#   return result

# Type to help serialize a column into Json encoding!
type
  ColJson = tuple
    kind:ColType
    data_json:string        # all data in json-encoded string

proc collect_elements(
    c:Column, 
    boundary:Natural,  # parent provides this!
    gather_indices: Option[seq[Natural]] = none(seq[Natural])  # to gather only specific indices!
    ):ColJson =   # directly return as json encoded string..

  result.kind = c.kind  # we can use this to further make decisions, to split, while consuming in a process or transformation!
  var indices:seq[Natural]
  if isSome(gather_indices):
    indices = gather_indices.get()
  else:
    indices = newSeq[Natural](boundary)
    for i in 0..<boundary:
      indices[i] = i
  
  case c.kind
  of colArrayString:
    var result_container = newSeq[seq[string]](len(indices))
    for i,idx in indices:
      # TODO: i think `split` could be made faster if we just do it ourselves, but give me a break !!
      result_container[i] = cast[ptr UncheckedArray[string]](c.payload)[idx].split(StringBoundary)
    result.data_json = result_container.toJson()

  of colString: 
    var result_container = newSeq[string](len(indices))
    for i,idx in indices:
      result_container[i] = cast[ptr UncheckedArray[string]](c.payload)[idx]   
    result.data_json = result_container.toJson()
      
  of colInt32:
    var result_container = newSeq[int32](len(indices))
    for i,idx in indices:
      result_container[i] = cast[ptr UncheckedArray[int32]](c.payload)[idx]
    result.data_json = result_container.toJson()
  
  of colBool:
    var result_container = newSeq[bool](len(indices))
    for i,idx in indices:
      result_container[i] = cast[ptr UncheckedArray[bool]](c.payload)[idx]   
    result.data_json = result_container.toJson()
  
  of colFloat32:
    var result_container = newSeq[float32](len(indices))
    for i,idx in indices:
      result_container[i] = cast[ptr UncheckedArray[float32]](c.payload)[idx]
    result.data_json = result_container.toJson()
  return result

proc add_int32(c:var Column, row_idx:Natural, data:int32, aliasing:bool = false)=
  assert c.kind == colInt32
  assert not isNil(c.payload)
  var arr = cast[ptr UncheckedArray[int32]](c.payload)
  arr[row_idx] = data

proc add_string(c:var Column, row_idx:Natural, data:string, aliasing:bool = false)=
  # NOTE: row_idx is supposed to be a valid as MetaIndex is supposed to verify the index accesses!
  # TODO: still can store max_offset like field in column to prevent invalid access at userspace level!
  assert not isNil(c.payload)
  assert c.kind == colString or c.kind == colArrayString
  var arr = cast[ptr UncheckedArray[string]](c.payload)
  arr[row_idx] = data

proc add_float32(c:var Column, row_idx:Natural, data:float32, aliasing:bool = false)=
  assert not isNil(c.payload)
  assert c.kind == colFloat32
  var arr = cast[ptr UncheckedArray[float32]](c.payload)
  arr[row_idx] = data

proc add_bool(c:var Column, row_idx:Natural, data:bool, aliasing:bool = false)=
  # NOTE: row_idx is supposed to be a valid as MetaIndex is supposed to verify the index accesses!
  # TODO: still can store max_offset like field in column to prevent invalid access at userspace level!

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

######################################################################################
# querying API (These must be as fast as possibly, currently OK, all optimizations should be focussed on faster queries)
#############################################################
template queryImpl[T](
  result_t: var seq[int32], # NOTE: must be enough to hold `top_k_t`!
  c_t:Column, 
  query_arr_t:openArray[T], 
  boundary_t, top_k_t:Natural,
  exact_match_t:bool,    # NOTE: if false, we match to all elements in this column, like a wildcard match!! 
  unique_only_t:bool
  ):Natural=
  
  if len(query_arr_t) > 1:
    doAssert unique_only == true, "Since OR-ing is expected to make sense with unique collection only for now!"

  var count = 0
  let arr = cast[ptr UncheckedArray[T]](c_t.payload)
  for row_idx in 0..<boundary_t:
    let curr_element = arr[row_idx]

    for query_t in query:
      if exact_match == false or curr_element == query_t:
        
        var is_unique = true

        if unique_only_t:
          # check if curr_element has not been repeated!
          for j in 0..<count:
            if arr[result_t[j]] == curr_element:
              is_unique = false
              break

        if is_unique:
          result_t[count] = row_idx.int32
          inc count
          
          if count == top_k:
            break

  count # return this..

template queryStringImpl(
  result_t: var seq[int32], 
  c_t:Column, 
  query_arr_t:openArray[string],  # acts like OR!
  boundary_t, 
  top_k_t:Natural,
  unique_only_t:bool
  ):Natural = 

  # NOTE:
  # By default, we will consider even a `substring` match as a valid match!, 
  # (If this is not fast-enough, it will be made fast-enough, it only makes sense to match substrings by default for real-world cases, until fuzzy search is added!)
  # By default, only unique matching data/rows indices are returned!

  # Returns:
  # number of `matched rows`, so as to slice `result_seq_t`

  if len(query_arr_t) > 1:
    doAssert unique_only == true, "Since OR-ing is expected to make sense with unique collection only for now!"

  doAssert c_t.kind == colString or c_t.kind == colArrayString  # TODO: use an api to get kind.. handle subkinds like colArraystring!

  var count = 0
  let arr = cast[ptr UncheckedArray[string]](c_t.payload)
  var unique_count = 0 # search up to that count..
  for row_idx in 0..<boundary_t:
    var current_item = arr[row_idx] # in either case, it will be a string.
    # since we by default consider `substrings` a match, we can just call `contains`.
    
    for query_t in query_arr_t:
      if query_t == "*" or current_item.contains(query_t):
        var is_unique = true
        
        if unique_only_t:
          for j in 0..<count:
            if arr[result_t[j]] == current_item: # "x|y|z" and "x|y|m" are considered unique/different, even query was "x"!
              is_unique = false
              break
          
        if is_unique:
          result_t[count] = row_idx.int32
          inc count
        
          if count == top_k:
            break
  
  # NOTE: we are only interested in (unique)`row indices`, if data is an array/arrayString, we wil check that given `query` is in that row or not, collection is different and may depend on the frontend needs!! 
  count    # return this..

proc query_string(
  c:Column, 
  query:openArray[string], # wildcard is allowed as * to gather all (unique)!
  boundary:Natural, 
  top_k:Natural,  # at-max this number of matches!
  unique_only:bool
  ):seq[int32]=
  # returns the matching row indices in the 
  # boundary: is provided by MetaIndex, telling it how many elements are currently in this/all columns.

  # This matches substring(query) in strings, if match is found, we collect the corresponding index.
  # later actually merges this somehow with fuzzySearch, for now just roll with it!
  
  var top_k = boundary # enough

  doAssert high(int32) > boundary
  var top_k_seq = newSeq[int32](top_k)
  let count_filled:Natural = queryStringImpl(
    top_k_seq, 
    c, 
    query, 
    boundary, 
    top_k,
    unique_only)
  result = top_k_seq[0..<count_filled] # TODO: prevent this copy! 
  return result

proc query_int32(
  c:Column, 
  query:openArray[int32],
  boundary:Natural, 
  top_k:Natural,
  exact_match:bool, # if False, we ignore the `query` and collect all unique values!
  unique_only:bool
  ):seq[int32]=
  assert c.kind == colInt32
  
  var top_k = boundary
  doAssert high(int32) > boundary
  var top_k_seq = newSeq[int32](top_k) # allocate at once... 
  let count_filled = queryImpl[int32](top_k_seq, 
    c, 
    query, 
    boundary, 
    top_k,
    exact_match,
    unique_only
    )
  result = top_k_seq[0..<count_filled] # TODO: prevent this copy!

proc query_float32(
  c:Column, 
  query:openArray[float32], 
  boundary:Natural, 
  top_k:Natural, 
  exact_match:bool,
  unique_only:bool):seq[int32]=
  assert c.kind == colFloat32
  
  var top_k = boundary             # since OR-ing, cannot be greater than boundary the number of matching indices, when unique!
  var top_k_seq = newSeq[int32](top_k) # allocate at once... 
  let count_filled = queryImpl[float32](
    top_k_seq, 
    c, 
    query, 
    boundary, 
    top_k, 
    exact_match,
    unique_only)
  result = top_k_seq[0..<count_filled] # TODO: prevent this copy!

proc query_bool(
  c:Column, 
  query:openArray[bool], 
  boundary:Natural, 
  top_k:Natural,
  exact_match:bool,
  unique_only:bool):seq[int32]=
  assert c.kind == colBool
  
  var top_k = boundary

  var top_k_seq = newSeq[int32](top_k) # allocate at once... 
  let count_filled = queryImpl[bool](
    top_k_seq, 
    c, 
    query, 
    boundary, 
    top_k, 
    exact_match,
    unique_only
    )
  result = top_k_seq[0..<count_filled] # TODO: prevent this copy!

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
    stringConcatenator:string = StringBoundary                 # we may support multiple strings for colString columns, by concatenating into a single string using this string/character.
    # actual order/column-id should not matter, as long as we provide correct mapping. (i.e key must match with column label)
    fields:Table[string, Natural]  # mapping from the column's label to the id in the columns. (want it to be same even after loading from disk!)
    dbCapacity:Natural          # max number of elements/data for each column. (have to set during initialization)
    dbName:string               # a name for the meta index (just to identify easily, not required though !)
    
    # append only, no deletion. (just invalidation may be)
    columns*:seq[Column] = @[]      # sequence of columns, easier to add a new column if schema changes !
    
    # syncing/locking
    dbRowPointer*:Natural = 0           # points to the row index which would be appended/added next. 
    
    # TODO: remove ?
    fieldsCache:seq[string]           # keeps temporary account of which fields/columns have been updated..so that we know all fields for a fresh row are there.
    rowWriteInProgress:bool = false   # indicates if a row writing in progress, in case we add data column by column, and not add whole row at once  
    # locks:seq[something]            # a lock for each of the column to provide concurrent reading/writing if independent columns are request by different clients!


proc `=copy`(a:var MetaIndex, b:MetaIndex) {.error.}
# proc `=sink`(a:var MetaIndex, b:MetaIndex) {.error.}
# destroy is automatic as we provide our own destroy for Columnobj...

const reserved_literals = ["dbName", "dbCapacity", "dbRowPointer", "alias"]

proc init*(name:string, column_labels:varargs[string], column_types:varargs[ColType], capacity:Natural = 1_000, rowPointer:Natural = 0):MetaIndex=
  # initialize the metaIndex based on the labels/column-names.
  # column_types: corresponding type for data being stored in each column.
  # note of python, we would create a  mapping from string to ColType.
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

    if column_type ==  colString or column_type == colArrayString:
        # NOTE: even colArrayString, would be saved as `string` for now, we use a `separator` to indicate boundaries!
        var column = new ColumnObj
        column.kind = column_type
        column.label = column_label
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

# proc `[]`(m:MetaIndex, key:string):lent Column {.inline.} =
proc `[]`(m:MetaIndex, key:string): Column =
  # i think we have to use borrow semantics if want to return column like this for read purposes, as copy is prohibited !
  let idx = m.fields[key]
  result = m.columns[idx]
  assert result.label == key, "Expected " & $key & " but got: " & $result.label
  return result


template populateColumnImpl(c_t:var Column, row_idx_t:Natural, data_t:JsonNode, concatenator_t:string, aliasing_t:bool = false)=
  # populate a  column, given data as JsonNode.
  # NOTE: also supports flattened array of strings. Concatenated  into a single string using a separator like | and splitted into (original) strings, when collecting .
  # multiple strings allowed helps in one to many modelling situations like say multiple artists for a song (where song is a document/resource). 

  # TODO: instead use the colKind to be supplied to this routine..

  if data_t.kind == JInt:
    c_t.add_int32(row_idx = row_idx_t, getInt(data_t).int32, aliasing = aliasing_t)
  elif data_t.kind == JString:
    let temp_data = getStr(data_t)
    assert not (temp_data.contains(concatenator_t)), "not expected to contain concatenator_t, it is reserved."
    c_t.add_string(row_idx = row_idx_t, data = temp_data, aliasing = aliasing_t)
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
        doAssert not data_str.contains(concatenator_t), "| is a reserved char to separate b/w elements of a list when stored as a single string.."
        final_string = final_string & concatenator_t  & data_str
      final_string = final_string & concatenator_t    # so that we can always know that it was an array even a single element and can send array back.
      
    # here indicate that this column possibly contains array of strings..
    c_t.kind = colArrayString # TODO: make it a proc/api . Donot change once assigned without a warning!
    c_t.add_string(row_idx = row_idx_t, data = final_string, aliasing = aliasing_t) 
  else:
    doAssert 1 == 0, "Unexpected data of type: "  & $data_t.kind 

proc modify_row_internal(
  m:var MetaIndex,
  row:JsonNode,    # row-data!
  row_idx:Natural, # NOTE: it could even be a row not yet written. (only default values....)
  all_attribute_checks:bool = true
  )=

  # it is also being used to write to row, not yet written, so `name/identifier` could be better.
  # supposed to be used internally!

  # Append a row, Must have data corresponding to each key/field!
  doAssert row.kind == JObject, "Expected to be key-value pairs for a row!"
  if all_attribute_checks:
    doAssert len(row) == len(m.columns) , "First, same number of keys, since appending a first row!"
  doAssert row_idx < m.dbCapacity

  # get the corresponding data for each of the column.
  for col_label, col_idx in m.fields:
    if all_attribute_checks:
      doAssert col_label in row
        
    if not (col_label in row):
      continue
    
    var c = m[col_label]
    let col_data_json = row[col_label] # must have the key! 
    case col_data_json.kind
    of JArray:
      # TODO: make it faster, i.e if an directly get "a|x|fda|" form, then can directly put into the column  
      # otherwise go through `getsSTR` -> `ARRAY` -> string!
      var temp_arr:seq[string]
      for x in col_data_json:
        temp_arr.add(getStr(x))
      c[row_idx] = temp_arr
    of JBool:
      c[row_idx] = getBool(col_data_json)
    of JFloat:
      c[row_idx] = getFloat(col_data_json).float32
    of JInt:
      c[row_idx] = getInt(col_data_json).int32   # TODO: check range to prevent over/underflow
    of JString:
      c[row_idx] = getStr(col_data_json)
    of JObject:
      doAssert 2 == 3, "Jobject type for column data is not allowed"
    of JNull:
      doAssert 2 == 3, "JnuLL not allowed as data type for now"
  # NOTE: no need to tally, as we get a key-error, for unmatched keys and we check that no-unexpected key is there either!

proc append_row*(
  m:var MetaIndex,
  row:JsonNode
)=
  m.modify_row_internal(
    row,
    row_idx = m.dbRowPointer,
    all_attribute_checks = true
  )
  inc m.dbRowPointer

proc modify_row*(
  m:var MetaIndex,
  row_idx:Natural,
  row:JsonNode
)=
  doAssert row_idx < m.dbRowPointer
  m.modify_row_internal(
    row_idx = row_idx,
    row = row,
    all_attribute_checks = false  # not necessary, we may be modifying some of the attributes!
  )

proc set_immutable()=
  # i am leaning towards aliasing rather than overwriting !
  # can set a  particular column to be immutable, but not vice-versa!
  discard

proc toJson(m:MetaIndex, count:Natural = 10):JsonNode =
  result = JsonNode(kind:JObject)
  let limit = min(m.dbRowPointer, count)
  for c in m.columns: 
    let (c_kind, raw_json) = c.collect_elements(boundary = limit)
    result[c.label] = raw_json.fromJson(JsonNode)
  return result

proc `$`*(m:MetaIndex, count:Natural = 10):string=
  return m.toJson(count = count).pretty()

###################################
## Querying #######################
######################################
proc query_column*(
  m:MetaIndex, 
  attribute:string,  # For now we are querying a single column at a time!
  query:JsonNode,    # wildcard * is allowed, to match all rows for a column, in case to collect all the elements from a column!
  top_k:Natural = 1000, # TODO: remove this.. since querying has to be done for whole data-base, doesn't matter to leave anything out without any prior/more information!
  unique_only:bool = true
  ):seq[int32]=
  # attribute_value: key/label value pairs, value is value is match for corresponding column.
  
  # NOTE:
  # Considers `substring` matches a considered a match, see comment in `querystringImpl`.
  # Only unique indices are returned!

  let boundary = m.dbRowPointer
  var top_k = boundary     
  let c = m[attribute]

  doAssert query.kind == JArray # query is supposed to be array of individual elements to be OR queried
  var exact_match = true
  for x in query:
    if x.kind == JString and getStr(x) == "*":   # Since OR-ing, any wildcard, mean all the `indices` anyway!
      exact_match = false   # wildcard!
      break
  
  let raw_json = query.toJson()
  case c.kind
  of colString:
    result = c.query_string(query = fromJson(raw_json, seq[string]), boundary = boundary, top_k = top_k, unique_only = unique_only)
  of colArrayString:
    # doAssert query.kind == JString
    result = c.query_string(query = fromJson(raw_json, seq[string]), boundary = boundary, top_k = top_k, unique_only = unique_only)
  of colInt32:
    var query_int32:seq[int32]
    if not exact_match: 
      query_int32 = @[0'i32] #doens't matter if exact_match is set to false! 
    else:
      query_int32 = fromJson(raw_json, seq[int32])
    
    result = c.query_int32(query = query_int32, boundary = boundary, top_k = top_k, exact_match = exact_match, unique_only = unique_only)
  of colBool:
    result = c.query_bool(query = fromJson(raw_json, seq[bool]), boundary = boundary, top_k = top_k, exact_match = exact_match, unique_only = unique_only)
  of colFloat32:
    var query_float32:seq[float32]
    if not exact_match: 
      query_float32 = @[0.0'f32] #doens't matter if exact_match is set to false! 
    else:
      query_float32 = fromJson(raw_json, seq[float32])
    
    result = c.query_float32(
      query = query_float32, 
      boundary = boundary, 
      top_k = top_k, 
      exact_match = exact_match, 
      unique_only = unique_only)
  return result

# we would want to 
# search for an attribute/column.
# search another..
# do and or... or whatever with indices..
# our duty for now is to return matching indices for a column, if you more than one query for that column. (do it more than once ! for now)
# it is on user to do OR AND operations.. once done.. use a set of indices to collect the rows...
# optionally can specify the labels to collect a subset of rows.n

proc collect_rows*(
  m:MetaIndex,
  attribute:string, # column label/name.
  indices:seq[Natural]
):ColJson = 
  # Collect specific elements/rows from a column!
  # this way let the python, call directly this.. and later recreate a ROW from elements of all columns!
  let c = m[attribute]
  result = c.collect_elements(
    boundary = m.dbRowPointer,
    gather_indices = some(indices)
  )
  return result


# proc collect_rows*(
#   m:MetaIndex, 
#   indices:varargs[Natural], 
#   ):JsonNode=

#   # i think it is better to collect raw-data/original type..
#   # then how we are supposed to pass to python..
#   # we are inheriting this extra cost .. first json encoding..
#   # then json decoding in python..
#   # first try to make encoding faster.. at least..

#   # how..
#   # since we know the type for each column..
#   # 

#   # def collect rows.
#   # 4 columns.
#   # c_1,c_2, c_3,c_4.
#   # row[0] = [c_1[0], c_2[0], c_3[0], c_4[0]]
#   # let python do the split..




#   # somehow find the desired indices/rows and then pass these to this routine to return an array.
#   result = JsonNode(kind:JArray)
#   for idx in indices:
#     assert idx < m.dbRowPointer
#     var result_temp = JsonNode(kind:JObject)
#     for c in m.columns:
#       # we use c.toJson to extract one row only ! (so don't have to write multiple implementations!)
#       if c.kind == colString:
#         result_temp[c.label] = (c.toJson(row_start = idx, row_end = idx + 1, splitter = m.stringConcatenator, latest_version = latest_version))[0]
#       else:
#         result_temp[c.label] = (c.toJson(row_start = idx, row_end = idx + 1, latest_version = latest_version))[0]
#     result.add(result_temp)
#   return result

# Type to represent info to be loaded and saved as json! (subset of the main object fields)
type
  MetaJson = tuple
    # NOTE: enough meta-data to initialize a new instance of MetaIndex. (without empty columns, populated independently from a dedicated per-column json file/data)
    dbRowPointer:Natural
    dbName:string
    dbCapacity:Natural
    column_labels:seq[string]
    column_types:seq[ColType]

proc save*(
  m:MetaIndex,
  save_dir:string    # Directory to save .json info to.
  ):Natural =
  
  assert dirExists(save_dir)
  var column_types = newSeq[ColType](len(m.columns))
  var column_labels = newSeq[string](len(m.columns))

  for i,c in m.columns:
    column_labels[i] = c.label
    column_types[i] = c.kind
    
    # save each column meta-data separately!
    let info:ColJson = c.collect_elements(boundary = m.dbRowPointer)
    
    # TODO: also alias data...
    let path = os.joinPath(save_dir, m.dbName & "_" & c.label & ".json")
    var f = open(path, fmWrite)
    f.write(jsony.toJson(info)) 
    f.close()


  # save necessary meta-data too.
  var other_meta:MetaJson
  other_meta.dbCapacity = m.dbCapacity
  other_meta.dbRowPointer = m.dbRowPointer
  other_meta.dbName = m.dbName
  other_meta.column_types = ensureMove column_types
  other_meta.column_labels = ensureMove column_labels
  
  let path = os.joinPath(save_dir,m.dbName & "_" & "meta_data.json")
  var f = open(path, fmWrite)
  f.write(jsony.toJson(other_meta))
  f.close()

  return 1



proc load*(
  name:string,
  load_dir:string
):MetaIndex = 
  # during load, we should be able to populate column, right..

  # but how..
  # by reading the colData directly..
  assert os.dirExists(load_dir)

  # load base meta-data.
  var path = os.joinPath(load_dir,name & "_" & "meta_data.json")
  var f = open(path, fmRead)
  var json_data = f.readAll()
  f.close()
  var base_meta:MetaJson = jsony.fromJson(json_data, MetaJson)
  doAssert base_meta.dbRowPointer < base_meta.dbCapacity

  # can init an empty index now.
  result = ensureMove init(
      name = base_meta.dbName, 
      capacity = base_meta.dbCapacity, 
      column_labels = base_meta.column_labels, 
      column_types = base_meta.column_types
      )
  result.dbRowPointer = base_meta.dbRowPointer # manually update, we check that each column have this `count` of data.

  # populate each column now (necessary memory would have been allocated!)
  for c in result.columns:
    # read corresponding `json` data for a column, from the disk!
    let path = os.joinPath(load_dir, result.dbName & "_" & c.label & ".json")
    doAssert os.existsFile(path), $path & " Doesn't exist!"
    let f = open(path, fmRead)
    let raw_data = f.readAll()
    f.close()

    let (c_kind, c_data_json) = jsony.fromJson(raw_data, ColJson)
    doAssert c_kind == c.kind, "Must match with the expected type one that we read from disk!" 
    
    case c_kind
    of colArrayString:
      var col_data = fromJson(c_data_json, seq[seq[string]])
      assert len(col_data) == result.dbRowPointer
      
      # NOTE: since colArrayString was saved as `string`, we first create a sequence of `array of string`
      for i in 0..<result.dbRowPointer:
        c[i] = col_data[i]
    of colString:
      # NOTE: for now array of string, is still same as string, except boundary would be indicate using a separator!
      var col_data = fromJson(c_data_json, seq[string])
      assert len(col_data) == result.dbRowPointer
      for i in 0..<result.dbRowPointer:
        c[i] = col_data[i]
    of colBool:
      var col_data = fromJson(c_data_json, seq[bool])
      assert len(col_data) == result.dbRowPointer
      for i in 0..<result.dbRowPointer:
        c[i] = col_data[i]
    of colFloat32:
      var col_data = fromJson(c_data_json, seq[float32])
      assert len(col_data) == result.dbRowPointer
      for i in 0..<result.dbRowPointer:
        c[i] = col_data[i]
    of colInt32:
      var col_data = fromJson(c_data_json, seq[int32])
      for i in 0..<result.dbRowPointer:
        c[i] = col_data[i]

###########################
##### helper routines #######
#######################################
proc reset*(m:var MetaIndex)=
  # just setting db.RowPointer to zero should be enough!
  m.dbRowPointer = 0

# proc get_all*(m:MetaIndex, label:string, flatten:bool = false):JsonNode=
#   # an array of string/float32/bool/int32
#   # may not be unique, more like flattened.. even if an array was provided for a row, like name = ["sam","ra"] .
#   # return all possible values for a label... have to remove duplicates by user !
#   let (col_kind, raw_json) = m[label].toJson(row_end = m.dbRowPointer, splitter = m.stringConcatenator)
#   result = raw_json.fromJson(JsonNode)

#   if flatten:
#     var temp = JsonNode(kind:JArray)
#     for elem in result:
#       if elem.kind == JArray:
#         for x in elem:
#           assert x.kind == JString
#           temp.add(x)
#       else:
#         temp.add(elem)
#     return temp
#   else:
#     return result


# proc check*(m:MetaIndex, key_value:JsonNode):bool=
#   # checks if value for given key/label exists !  
#   let matched_indices = m.query(key_value)
#   return len(matched_indices) > 0

proc set_primary_key(m:MetaIndex, label:string)=
  # make a key primary key.. 
  # here create a set/index for faster collecting a row..
  # can be set whenever...i think!

  discard


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
  
  
  var j2 = %* {"name": ["kiara", "issac"], "age":42}


  var j3 = %* {"name": ["nain"], "age":30}
  var m = init(name = "test", column_labels = ["age", "name"], column_types = [colInt32, colArrayString])
  

  # adding some data/rows.
  # m.add_row(column_data = j3)
  m.append_row(row = j3)
  m.append_row(row = j2)

  # m.add_row(column_data = %* {"name":"nain", "age":21})
  # m.add_row(column_data = %* {"name":["tyson" , "samy"], "age":40})
  # m.modify_row(row_idx = 1, meta_data = %* {"name":["tyson" , "samy"]})
  echo m   # good enough for a preview !

  # m.save("./test_meta_save.json")
  echo m.save(
    save_dir = "."
  )

  var row_indices = m.query_column(
    attribute = "name",
    query = parseJson("ss".toJson()),
    # query = parseJson("*".toJson())
  )
  echo row_indices

  let(c_kind, c_json) = m.collect_rows(
    attribute = "name",
    indices = row_indices
  )
  echo c_json.fromJson(seq[seq[string]])

  # var new_m =  load(
  #   name = "test",
  #   load_dir = "."
  # )
  # echo new_m

  # var m2 = load("./test_meta_save.json")
  # echo m2

  # var m2 = load("./test_meta_save.json")
  # echo m2.toJson()

  # then check if query is working
  # echo m.query_string(attribute = "name", query = "baf")
  # echo m.query_int32(attribute = "age", query = 31)

  
  # collect some rows, 
  # echo m.collect_rows(indices = [Natural(1)])

  # modification
  #proc modify_row*(m:var MetaIndex, row_idx:Natural, meta_data:JsonNode)=
  # m.modify_row(row_idx = 1, meta_data = %* {"age":33})
  # m.modify_row(row_idx = 1, meta_data = %* {"name":"malcom"})
  # m.modify_row(row_idx = 1, meta_data = %* {"name":["tyson" , "samy"]})

  # echo m.collect_rows(indices = [Natural(1)])
  # echo m.toJson()
  # echo m["name"].kind
  # m.modify_row(row_idx = 1, meta_data = %* {"name":["tyson" , "samy"]})
  # echo m["name"].kind
  # # save
  # m.save("./test_meta_save.json")
  # echo m

  # var m2 = load("./test_meta_save.json")
  # echo m2.toJson()
  # echo m2
  # echo m

  # m2.modify_row(row_idx = 1, meta_data = %* {"name":"malcom"})
  # # echo m2
  # # echo m2.toJson()
  # m2.modify_row(row_idx = 1, meta_data = %* {"name":"iownyou"}, force = true)
  # echo m2.toJson()
  # m2.save("./test_meta_save.json")
  
  # echo m2




  # echo "written to disk !!"
  # var m2 = load("./test_meta_save.json")
  # echo "loaded from disk!!"
  # echo m2    


 
  # echo m.rowPointer

  # echo c.label

  # echo c.toJson(row_end = 1)
  
  # echo m.toJson().pretty()
  # echo $m.toJson()

  # let serial_json = $m.toJson()
  # echo typeof(serial_json)
  # echo parseJson(serial_json)


# have to save schema more clearly..
# but how..
# have to save, columnType too...
# so as to know.. what to expect.

# MetaIndexMeta
# labels:seq[string]
# columnTypes: seq[ColType]
# then to save each column right..

# proc save
# save meta-data like dbRowPointer.
# plus some columnnMetadata like kind..
# save each column separ

# kind..
# and then data..
# prefix  + label.json


# load
