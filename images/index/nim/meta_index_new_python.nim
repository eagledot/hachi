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
import meta_index_new

# init
let
  pytype_2_coltype = newTable({"string":colString, "int32":colInt32, "float32":colFloat32, "bool":colBool})

var m:MetaIndex  # update this..
proc init(name:string, column_labels:varargs[string], column_types:varargs[string], capacity:Natural = 1_000){.exportpy.}=
  # initialize the metaIndex.
  var nim_column_types:seq[colType]
  for py_type in column_types:
    nim_column_types.add(pytype_2_coltype[py_type])
  
  m = ensureMove init(name = name, capacity = capacity, column_labels = column_labels, column_types = nim_column_types)

proc load(path:string){.exportpy.} =
  # load directly from the json stored on the disk!
  # can be used in-place of the init... if already saved.. write if else on the python side ... as needed!
  m = ensureMove meta_index_new.load(path)

proc save(path:string){.exportpy.}=
  # write the json encoding of the database to the disk.
  m.save(path)

# update
proc put(data:string){.exportpy.}=
  # can put/append a dict as a row into the database at once.
  # NOTE: expects all the keys to be there.. provide a default value if needed , cannot be null/none.
  # data : JsonEncoded string/bytes.

  let json_obj = parseJson(data)
  m.add_row(json_obj) # can sink the json_obj i think.. or compiler does this automatically...

# query.
proc query(query:string, exact_string:bool = true, top_k:Natural = 0):string {.exportpy.} = 
  # query is supposed to be jsonEncoded string, with column names as keys.
  # top_k as 0 means all possible matches. (during suggestion we can set it to 100 or something.)
  # exact_string: i.e match exact string or substring is enough, (default is true)
  # returns:
    # we return an array of row_indices, matched for given query. (in Json encoded form.) on python json.loads() should be enough !
  
  # we return a serialized object (json string), whose each key is a column name and values are row indices.
  # based on the indices... python can do some OR And like operations if needed.
  # later then use those indices to collect the rows easily..

  var result = JsonNode(kind:JObject)
  let query_params = parseJson(query)
  for key, value in query_params:
    var indices = m.query(attribute_value = %* {key:value}, exact_string = exact_string, top_k = top_k)

    # update the corresponding key with collected row indices.
    var temp = JsonNode(kind:JArray)
    for ix in indices:
      temp.elems.add(JsonNode(kind:Jint, num:BiggestInt(ix)))
    result[key] = ensureMove temp
  return $result  # calling $ seems enough to generate string/serialized repr from a JsonNode!

proc collect_rows(indices:varargs[Natural], latest_version:bool = true):string {.exportpy.}=
  # TODO: see if we can do this from python using a list of ints!!  
  result = $m.collect_rows(indices = indices, latest_version = latest_version)

# modify
# what would modification look like?
# idea is to be able to modify/overwrite a (mutable) column in case we collect fresh data.
proc modify(row_idx:Natural, meta_data:string, force:bool = false){.exportpy.}=
  ## Inputs:
    # row_idx, a valid row index, it on user to collect that/them by calling query routine.
    # meta_data: new key/value pairs . where key is the column label and value would be new data to be updated.
  
  let meta_data = parseJson(meta_data)
  m.modify_row(row_idx = row_idx, meta_data = meta_data, force = force)

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
    let temp = c.kind
    for key, value in pytype_2_coltype:
      if value == temp:
        py_types.add(JsonNode(kind:JString, str:key))
        break
  return $py_types

proc get_all_elements(attribute:string):string {.exportpy.}=
  # an (flattened) array of all values for a given attribute!
  # may contains duplicates... just flatten...
  return $m.get_all(attribute, flatten = true)

proc check(attribute_value:string):bool {.exportpy.}=
  # checks if attribut value pair exits...
  # would be faster in future.. if attribute is a primary-key/id
  return m.check(parseJson(attribute_value))



    
