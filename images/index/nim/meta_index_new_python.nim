# writing the python module to engage with the meta index.
# Assumptions
# int -> int32  (python can have arbitrary sized integers, so some checking needs to be done) (during adding new data only ).
# multiple strings are concatenated to a single string , something like a | b, using | .. to make it easier to have one to many modelling.
# that is handled by MetaIndex nim, so python side always gets whats expected !
# no float values for now..(can easily do so .. if all things work out)

# NOTE: no concept of primary key, user can choose to assume one... and keep following that.
# any key/column can be made immutable.. to prevent buggy writes !

# extra filter/preprocessing should be done on python size based on the application needs.
# MetaIndex provides necessary querying and population (put/append) routines. to easily update using Json/dict data from python side.
# i think we can  experiment with the python code to easily create range based filters and stuff.. 
# i want underlying metaIndex to be just fast at querying a single column.. (have to add multi-threaded code) and then Simd based code as time allows.I


import std/json
import std/tables

import nimpy
import jsony

import meta_index_new

# init
let
  pytype_2_coltype = newTable({
    "arrayString":colArrayString,
    "string":colString, 
    "int32":colInt32, 
    "float32":colFloat32, 
    "bool":colBool})

var m:MetaIndex  # update this..
proc init(name:string, column_labels:varargs[string], column_types:varargs[string], capacity:Natural = 1_000){.exportpy.}=
  # initialize the metaIndex.
  var nim_column_types:seq[ColType]
  for py_type in column_types:
    nim_column_types.add(pytype_2_coltype[py_type])
  m = ensureMove init(name = name, capacity = capacity, column_labels = column_labels, column_types = nim_column_types)

proc load(
  name:string,      # prefix, to load data for a specific meta-index, in case more than 1.
  load_dir:string   
  ):int{.exportpy.} =
  # load directly from the json stored on the disk!
  # can be used in-place of the init... if already saved.. write if else on the python side ... as needed!
  m = ensureMove meta_index_new.load(
    name = name,
    load_dir = load_dir)
  return m.dbRowPointer

proc save(
  save_dir:string    # path to directory where meta-index info would be saved.
  ):int {.exportpy.}=
  return m.save(save_dir)

# append
proc append(
  data:string
  ){.exportpy.}=
  # data : a JsonEncoded Dict , mapping from column name to its value.
  let json_obj = jsony.fromJson(data, JsonNode)
  m.append_row(json_obj)
  
# query.
proc query_column(
  attribute:string, # column Name
  query:string,     # json encoded string!
  unique_only:bool = true
  ):string {.exportpy.} = 
  # query is supposed to be jsonEncoded string, with column names as keys.
  # Return Indices for the rows matched! (we json encode it, can make it faster by writing directly to python memory, but later people!!!)
  
  let query = query.fromJson(JsonNode)
  doAssert query.kind == JArray, "Expected an array, if a single element, wrap it into an iterable/list first!"
  var indices = m.query_column(
    attribute = attribute,
    query = query,
    unique_only = unique_only 
    )
  return indices.toJson() 

proc collect_rows(
  attribute:string,    # column label/name
  indices:seq[Natural] # generally collected from  `query` routine.
  ):string {.exportpy.}=
  # Returns by default the Json-encoded, array of elements from `attribute` at indicated `indices`!
  let (col_kind, col_data_json) = m.collect_rows(
    attribute,
    indices = indices
  )
  return col_data_json

# modify
proc modify(
  row_idx:Natural, 
  meta_data:string, 
  ){.exportpy.}=
  # Modify/overwrite some of the attribute, with new values!

  ## Inputs:
    # row_idx, a valid row index, it on user to collect that/them by calling query routine.
    # meta_data: new key/value pairs . where key is the column label and value would be new data to be updated.
  
  let meta_data = meta_data.fromJson(JsonNode)
  m.modify_row(
    row_idx = row_idx, 
    row = meta_data
    )

##############
# meta-information about database itself.
#####

proc reset(){.exportpy.} = 
  # reset the index to fresh state!
  m.reset()

proc get_column_labels():string {.exportpy.}=
  var labels = JsonNode(kind:JArray)
  for c in m.columns:
    labels.add(JsonNode(kind:JString, str:c.label))
  return $labels

proc get_column_types():string {.exportpy.}=
  var py_types = JsonNode(kind:JArray)
  for c in m.columns:
    var temp = c.kind
    for key, value in pytype_2_coltype:
      if value == temp:
        py_types.add(JsonNode(kind:JString, str:key))
        break
  echo $py_types
  return $py_types

# proc get_all_elements(attribute:string):string {.exportpy.}=
#   # an (flattened) array of all values for a given attribute!
#   # may contains duplicates... just flatten...
#   return $m.get_all(attribute, flatten = true)

# proc check(attribute_value:string):bool {.exportpy.}=
#   # checks if attribut value pair exits...
#   # would be faster in future.. if attribute is a primary-key/id
#   return m.check(parseJson(attribute_value))



    
