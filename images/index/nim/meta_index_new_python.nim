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
  ){.exportpy.} =
  # load directly from the json stored on the disk!
  # can be used in-place of the init... if already saved.. write if else on the python side ... as needed!
  m = ensureMove meta_index_new.load(
    name = name,
    load_dir = load_dir)

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
  exact_string:bool = true, 
  unique_only:bool = false
  ):string {.exportpy.} = 
  # query is supposed to be jsonEncoded string, with column names as keys.
  # exact_string: i.e match exact string or substring is enough.

  # Return Indices for the rows matched! (we json encode it, can make it faster by writing directly to python memory, but later people!!!)
  
  var indices = m.query_column(
    attribute = attribute,
    query = query.fromJson(JsonNode), 
    exact_string = exact_string, 
    unique_only = unique_only
    )
  return indices.toJson() 

proc collect_rows(
  attribute:string,    # column label/name
  indices:seq[Natural] # generally collected from  `query` routine.
  ):string {.exportpy.}=
  let (col_kind, col_data_json) = m.collect_rows(
    attribute,
    indices = indices
  )
  # NOTE: may be can send `col_kind` too, but python should know about corresponding data-type for its column already!
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
    meta_data = meta_data
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

    # TODO: its a patch..should be an api/routine to get base kind!
    var temp = c.kind
    if temp == colArrayString:
      temp = colString
    
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



    
