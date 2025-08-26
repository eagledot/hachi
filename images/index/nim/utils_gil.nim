# Resources: 
# https://docs.python.it/html/api/threads.html

import nimpy
import nimpy/py_lib as python_lib  # py_lib namespace may interfere with global variable `pyLib` representing the `python dll`.
import nimpy/py_types 
import dynlib

# NOTE: Locking not required, since:
# 1. as long has function semantics is such that, memory writes are independent, function abstraction easily extend to multi-thread programming!
# 2. also either thread-safe like `has-gil`, or already protected by python GIL, so at any time, only one thread could be calling it (like inc_ref_count, dec_ref_count)
import std/locks
var L:Lock

{.pragma: pyfunc, cdecl, gcsafe.}
type PyThreadState = pointer # no need to know the internal structure.. as long as we provide right pointer to the right routine, binary world though efficient is a mean and mundane world !!!

proc inc_ref_count*(obj:PyObject)=
    let func_ptr = cast[proc(o:PPyObject):void {.pyfunc.}](pyLib.module.symAddr("Py_IncRef"))
    func_ptr(obj.privateRawPyObj)

proc dec_ref_count*(obj:PyObject)= 
    cast[proc(o:PPyObject):void {.pyfunc.}](pyLib.module.symAddr("Py_DecRef"))(obj.privateRawPyObj)

var hasGilFunc: proc(): cint {.pyfunc.} = nil
var saveThreadStateFunc: proc(): PyThreadState {.pyfunc.} = nil
var restoreThreadStateFunc: proc(state:PyThreadState):void {.pyfunc.} = nil
var incRefCountFunc : proc(o:PPyObject):void {.pyfunc.}
var decRefCountFunc : proc(o:PPyObject):void {.pyfunc.}

var is_initialized = false

proc initFuncPointers*()=
    doAssert not isNil(pyLib.module), "Must have been initialized before calling this.."
    doAssert is_initialized == false, "Call initFuncPointers first after importing the extension, only once!"
    
    # NOTE: following variable even though global, will only be updated by a thread which held GIL, hence by definition, no concurrent access is possible, as long as being called from (C)python no-GIL implementations!
    saveThreadStateFunc = cast[proc() : PyThreadState {.pyfunc.}](pyLib.module.symAddr("PyEval_SaveThread"))
    restoreThreadStateFunc = cast[proc(state:PyThreadState):void {.pyfunc.}](pyLib.module.symAddr("PyEval_RestoreThread"))
    hasGilFunc = cast[proc(): cint {.pyfunc.}](pyLib.module.symAddr("PyGILState_Check"))
    
    # NOTE: be careful about spelling for `python API`, We can be sure only about `stable API`.
    incRefCountFunc = cast[proc(o:PPyObject):void {.pyfunc.}](pyLib.module.symAddr("Py_IncRef"))
    decRefCountFunc = cast[proc(o:PPyObject):void {.pyfunc.}](pyLib.module.symAddr("Py_DecRef"))

    is_initialzed = true
    echo "Done initing func pointers.."

proc has_gil*():bool = 
    doAssert is_initialized, "Call initFuncPointers first after importing the extension, only once!"
    # checks if this thread has (acquired) GIL. Can be called from any Thread at any time! 
    hasGilFunc = cast[proc(): cint {.pyfunc.}](pyLib.module.symAddr("PyGILState_Check"))
    return (hasGilFunc() == 1)

proc saveThreadState*():PyThreadState = 
    # initLock(L)
    doAssert is_initialized, "Call initFuncPointers first after importing the extension, only once!"
    result = saveThreadStateFunc()
    # deinitLock(L)
    return result

proc restoreThreadState*(state:PyThreadState)=
    doAssert is_initialized, "Call initFuncPointers first after importing the extension, only once!"
    # initLock(L)
    doAssert not isNil(state)
    restoreThreadStateFunc(state)
    # deinitLock(L)

proc inc_ref_count*(obj:PyObject)=
    doAssert is_initialized, "Call initFuncPointers first after importing the extension, only once!"
    incRefCountFunc(obj.privateRawPyObj)

proc dec_ref_count*(obj:PyObject)= 
    doAssert is_initialized, "Call initFuncPointers first after importing the extension, only once!"
    decRefCountFunc(obj.privateRawPyObj)

