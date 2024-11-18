# writing the python module to engage with the meta index.
# Assumptions
# int -> int32  (python can have arbitrary sized integers, so some checking needs to be done) (during adding new data only ).
# multiple strings are concatenated to a single string , something like a | b, using | .. to make it easier to have one to many modelling.
# that is handled by MetaIndex nim, so python side always gets whats expected !
# no float values for now..(can easily do so .. if all things work out)


# extra filter/preprocessing should be done on python size based on the application needs.
# MetaIndex provides necessary querying and population (put/append) routines. to easily update using Json/dict data from python side.
# i think we can  experiment with the python code to easily create range based filters and stuff.. 
# i want underlying metaIndex to be just fast at querying a single column.. (have to add multi-threaded code) and then Simd based code as time allows.I


import std/json
import nimpy

import ./meta_index_new


# init
var m:MetaIndex  # update this..
proc init(name:string, column_labels:varargs[string], column_types:varargs[string], capacity:Natural = 1_000){.exportpy.}=
  # initialize the metaIndex.
  var nim_column_types:seq[colType]
  for py_type in column_types:
    if py_type == "string":
      nim_column_types.add(colString)
    elif py_type == "int32":
      nim_column_types.add(colInt32)
    else:
      doAssert 1 == 0, "only types accepted are int32 and string from python side, but got: " & $py_type

  m = ensureMove init(name = name, capacity = capacity, column_labels = column_labels, column_types = nim_column_types)
  echo "i think done!"
  echo m
  

# update
proc put(data:string){.exportpy.}=
  # data : JsonEncoded string/bytes.
  let json_obj = parseJson(data)  # pass it to thei
  echo "got json as: ", json_obj
  m.add_row(json_obj)
  echo m 

# query.
proc query(query:string):string {.exportpy.} = 
  # query is supposed to be jsonEncoded string, with column names as keys.


  # we can also return an object, whose each key is a column name and values are row indices.i
  # based on the indices... python can do some OR And like operations if needed.
  # later then use those indices to collect the rows easily..


  var result = JsonNode(kind:JObject)
  let query_params = parseJson(query)
  doAssert query_params.kind == JObject
  for key, value in query_params:
    var indices:seq[Natural]
    if value.kind == JString:
      indices = m.query_string(attribute = key, query = getStr(value))
    elif value.kind == JInt:
      indices = m.query_int32(attribute = key, query = getInt(value).int32)
    else:
      doAssert 1 == 0, "not expected type: " & $value.kind

    # update the corresponding key with collected row indices.
    var temp = JsonNode(kind:JArray)
    for ix in indices:
      temp.elems.add(JsonNode(kind:Jint, num:BiggestInt(ix)))
    result[key] = ensureMove temp

  return $result  # is this good enough.. to convert a jsonNode to string!

proc collect_rows(indices:varargs[Natural]):string {.exportpy.}=
  # TODO: see if we can do this from python using a list of ints!!  
  result = $m.collect_rows(indices = indices)
      
  
      
  
    
