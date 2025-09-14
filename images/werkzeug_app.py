# A try to create a simple WSGI app using just werkzeug.

# Motivations:
# 1. Do away with flask, (Even though very light), we would just be using this For (REST?) APIs, so for now no need of other features from flask.
# 2. Just include the werkzeug in the `python_modules` to be shipped along , rather than installing flask/werkzeug  (current code is good enough for our use-case!)

# NOTES:
# each request is handled by a new instance of `requestHandler class` so not much to worry or think about calling it from different threads.
# This requestHandler class has a `handle` method of actually do something based on the request bytes.. THIS IS CALLED during `init` itself, so instantization handles the `handling` as well.
# `RequestHandlerClass(server_address, ..)` will call `handle` also 

# Where this class is called/instantized, would be decided on the concurreny mechanism being followed by the underlying `server`, could be blocking (aka on same thread)
# or could be `threading` each in a new thread.. or could be in a new process aka forking.
# we modified code in `serving.py` to instead use a pool of thread, reading from a `common queue`. 
# so necessary info is read, like a request and client address. then requestHandler class is called/inited in `finish_request` routine.



# A simple app.
# We just need to define a `__call__` which should accept `environ` and `start_response`.

# based on the evironment/request-headers, we will call a corresponding `function` to return generally bytes.
# These bytes can then be returned.. directly 
# Reponse(bytes, mime-types a nd sutff) . # based on mime-type
# Reponse(environ, start_response)

# App:
# would be called with `environ` and `star`

from typing import Iterable, Callable, Optional
import sys
sys.path.insert(0, "../python_modules") # our copy of werkzeug!

from werkzeug.wrappers import Request, Response
import threading

def on_api(request:Request, page_id:int) -> Response:
    print("page_id: {} ".format(page_id))
    print(request.url)
    sample = {"fas":32}
    # no return the response.. what happens 
    return Response("PP")

    # return Response(
    #     ["yo"],
    #     mimetype = "text/plain"
    # )
def on_index(r:Request) -> Response:
     # generally request object is not used, but corresponds to the `request/environment`, this view has been called for after URL matching/routing!
      
     # Do some work..
     # generate resulting bytes to be sent back to client.
     # wrap it into an WSGI application.. after setting headers and mime-type.
     # this we return back!
    response = Response(
            "you called me",
            mimetype = "text/plain"
        )
    return response


# can use routes from werkzeug itself, to better match endpoints to the view or controller routines.
# we should be able to do so ..
# A combination of views dict and mapper to get the correponding 
from werkzeug.routing import Map, Rule
from werkzeug.exceptions import MethodNotAllowed

# endpoints to View mapping.
# it could be assembled into !

# ----------
# Utils
# ----------
import inspect
def validate_signature(rule:str, view_function:Callable):
    # Ok
    # given a (callable) view/controller routine, we try to match with the corresponding rule.
    # i.e for a rule `api/<token>/<int:page_id>`, we will see if corresponding callable have `token` and `page_id` as its arguments!
    # Should help in case, when callable/routines are being assigned to a URL. i.e flexible than default `flask` close but useful coupling of view with decorators. (this way common mistakes could be caught, when coupling a function with a rule/url )

    # Rules: to be parsed as Rule for werkzeug, "/api/<int:page_id>" , where page_id is a placeholder!

    # The following equivalent check seems to be performed by werkzeug too!
    # extract the placeholders.
    placeholders = []
    start_ix = rule.find("<")
    while start_ix != -1:
        end_ix = rule.find(">", start_ix + 1)
        assert end_ix != -1, "Was supposed to find matching >" 
        temp = (rule[start_ix+1:end_ix])

        # simple parsing, as i am assuming 
        # 1. <page_id> OR
        # 2. <int(optional args for convertor):page_id>   # convertor followed by arg
        # TODO: there should be code in werkzeug.routes already doing this parsing.
        placeholder = temp.split(":")[-1].strip()
        print("placeholder: {}".format(placeholder))
        placeholders.append(placeholder)
        start_ix = rule.find("<", end_ix + 1)

    print("Placeholders: {}".format(placeholders))
    func_input_args = inspect.getfullargspec(view_function)[0]
    for p in func_input_args:
        assert p in func_input_args, "{} argument doesn't seem to a valid arg for provided function {}. Are you sure this is the right view_function?".format(p, view_function.__name__)
    # -----------------------------------------
    
    # We also can check, if no placeholders in rule, there must be either defaults in the callable or no args at all.
    n_default_args = 0 if view_function.__defaults__ is None else len(view_function.__defaults__)
    n_nondefault_args = len(func_input_args) - n_default_args
    assert n_nondefault_args >= 1, "Make sure you view_function expects foremost argument of type Request, as `(r:Request, ...) , r would be generated based on the http environment!"
    assert n_nondefault_args - 1  == len(placeholders), "view function expect atleast {} non-default args, but placeholders are {}!".format(n_nondefault_args, placeholders)
    del placeholders

def on_extension(r:Request):
    print("i am extension!")
    return Response("ok", status = 200)

class SimpleApp():
    # WSGI app emulating, to be called with (Environ and start_response callable!)
    def __init__(self):
        pass
        self.initialzed = False
        self.http_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        
        self.url_map = None # we will lazily initialize it!
        self.endpoint_2_uri:dict[str, tuple[Rule, list[str]]] = {}
        self.endpoint_2_viewFunction:dict[str, Callable] = {}

        # registered extensions. Multiple extensions could be developed independently and can be registed through a "main/master" app in a single desired location!
        self.extension_prefix = "ext" # as apps would be registered/available at <base_url>/ext/<app_name>/<app_rules> defined!
        self.registered_extensions:dict[str, SimpleApp] = {}

    def add_url_rule(self, 
                     
                     # rule to match to an endpoint, multiple rules could match to an endpoint. (TODO: properly thing over it!)
                     rule:str, 
                     view_function:Callable, # corresponding view/controller function for this endpoint!
                     endpoint:Optional[str] = None, # set to view_function identifier if not provided!
                     methods:list[str]= ["GET"]):
        """
        We add `allowed method` and `uri` info for an endpoint.
        endpoint for now are supposed to be unique . (This is bare-bone !)
        Given endpoint, we will map to unique function! 
        """
        # TODO: error should be only, (rule, methods) are different, otherwise overwrite!
        if endpoint is None:
            endpoint = view_function.__name__
        print("Endpoint is: {}".format(endpoint))

        assert not (endpoint in self.endpoint_2_uri)
        for m in methods:
            assert m in self.http_methods
        print(rule)

        validate_signature(rule, view_function)

        self.endpoint_2_uri[endpoint] = (Rule(rule, endpoint = endpoint), methods)
        self.endpoint_2_viewFunction[endpoint]  = view_function
        self.initialzed = False
    
    def initialize(self):
        self.url_map = Map(
                [(v[0]) for v in self.endpoint_2_uri.values()]
            )
        self.initialzed = True

    def __call__(self, environ, start_response) -> Iterable[bytes]:
        if not (self.initialzed):
            print("Initializing...")
            self.initialize()

        print("[DEBUG]: Being called in thread: {}".format(threading.current_thread().ident))
        # NOTE: this environ is basically raw-bytes received on a socket. (depending upon the level in OSI model, assume for this HTTP protocol!)
        # NOTE: can assume this environ/data a new (not-shared) instance, and we generate raw-bytes purely on environ, so should be thread-safe, even without GIL( in-case we wish to experiment) ! 
        # start_response is created by WSGI server and passed according to WSGI protocol.

        # --------------------
        # Check for extension!
        # --------------------
        temp_path = environ['PATH_INFO']
        temp_split = temp_path.split("/")
        print(temp_split)
        print(temp_path)
        if temp_split[1] == self.extension_prefix:
            # We aim to strip extension specific path, before calling registered extension (wsgi app).
            # This way extension doesn't need to worry in which context it is being called, and can be fully developed in isolation!
            extension_name = temp_split[2]
            assert extension_name in self.registered_extensions
            print("[Routing to ]: {}".format(extension_name))
            extension_path = temp_path.replace("/{}/{}".format(self.extension_prefix, extension_name), "")
            print("extension path: {}".format(extension_path))

            # NOTE: we slightly modify the environ. (good enough for us! but be-careful, in case underlying representation changes!)
            # NOTE TODO: for now i am assuming the following 3 as equivalent !!
            environ['PATH_INFO'] = extension_path
            environ['REQIEST_URI'] = extension_path
            environ['RAW_URI'] = extension_path 
        del temp_split, temp_path
        # -------------------------------------------

        # Start_response is about indicating the response start phase.
        # Mainly set the headers and status, conditioned on request being handled.
        # For example, if `streaming` is done, we can set the headers to indicate that.. main WSGI server would only need to read headers and status, without caring about what application code is doing.
        # return ["Hello World!".encode("utf8")]

        request = Request(environ = environ) # just wrapping up the environ to easily query various headers and stuff!
        urls = self.url_map.bind_to_environ(environ) # try to match environment/url to one of endpoints defined for this app.
        endpoint, args = urls.match()
        assert not (endpoint is None)
        expected_methods = self.endpoint_2_uri[endpoint][1]
        print("Expected methods: {}".format(expected_methods))

        if not (request.method in expected_methods):
            print("Got: {}".format(request.method))
            # method not allowed exception! wanted to use MethodNotAllowed
            # i cannot figure out the usage of MethodNotAllowed anyway!
            response = Response("Not allowed ", status = 405)
        else:
            response = self.endpoint_2_viewFunction[endpoint](request, **args) # itself an wsgi app!  
        
        # TODO: better way to enforce/check the response object is of type Response!
        assert "Response" in str(response.__class__) , "Expected the view function to return data of Response type. Wrap the return value with something like `Response(return_value, mimetype = ...)` !"
        return response(environ, start_response)

    def register(self, app, name:str):
        # some idea to register more simpleApp/ WsgiApps easily 
        # for example this app may live at : /ext/<name>/<app_rules>
        # we strip the prefix and app_name, before calling upon `registered app`
        
        # register an extension/app . (app calling this can be considered main/master)!
        name = name.strip("/")
        assert not (name in self.registered_extensions)
        assert not (" " in name), "Spaces are not allowed in name, but got: {}".format(name)
        # TODO: check no `self.extension_prefix` in app rules, 
        
        self.registered_extensions[name] = app
        print("Extension registered at: {}/{}".format(self.extension_prefix, name))

def create_app() -> SimpleApp:
    return SimpleApp()



if __name__ == "__main__":
    from werkzeug.serving import run_simple
    from werkzeug.test import create_environ

    app = create_app()
    print("[DEBUG]: Main thread is: {}".format(threading.current_thread().ident))

    def on_query(request, page_id:int):
        print("request: {}".format(request))
        return "Got page_id: {}".format(page_id)
    
    # add all the rules, seems like a bit of work, but actually 
    # then we don't have to worry, where our functions come from!
    # simpler python application like all other code!
    app.add_url_rule(
        rule = "/index",  # url rule.
        view_function = on_index,
        methods = ["GET"]
    )
    app.add_url_rule(
        rule = "/api/<int:page_id>",  # url rule.
        view_function = on_api,
        methods = ["GET"]
    )

    # following block could be done anywhere before calling register here or in main file!
    gp = SimpleApp()  # an extension!  can be developed invidually!
    app.add_url_rule(rule = "/test", view_function= on_extension)
    # -------

    app.register(
        gp,
        name = "googlephotos"
    )

    # now using a url to /ext/googlephotos/test should invoke
    # the test rule for `gp`
    # ...

    # would like to test it though, so how are we are gonna go about that!
    # i think provides a client to test it..
    # without creating a server!
    # any wsgi app we create
    from werkzeug.test import Client
    c = Client(app)

    # # test routes !
    # result = c.get("http://localhost:8080/api/52") # let us see what happens!
    result = c.get("http://localhost:8080/ext/googlephotos/test")
    print(result)

    # app.initialize()
    # print(app.url_map)
    
    # environ = create_environ("/index", "http://localhost:8080")
    # urls = app.url_map.bind_to_environ(environ)
    # print(urls.match())

    # run_simple(
    #     hostname = "localhost",
    #     port = 8100,
    #     application = app, # pass our app instance!,
    #     threaded = True    # handle each request in a new thread or one of the pool threads!
    # )

# i think even with our new thread mixing class, 
# its ok, if we get some error it is bubbled in the main wsgi server.
# unlike the dedicated thread we were running!

# on each new http request, http handler is created fresh..
# which will then do what!
# it would run the `actual function to handle that`
# that function would do what!

# for an app
# app = SimpleApp()
# app.add_url_rule()
# and stuff!