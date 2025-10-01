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
        # print("placeholder: {}".format(placeholder))
        placeholders.append(placeholder)
        start_ix = rule.find("<", end_ix + 1)

    # print("Placeholders: {}".format(placeholders))
    func_input_args = inspect.getfullargspec(view_function)[0]
    for p in func_input_args:
        assert p in func_input_args, "{} argument doesn't seem to a valid arg for provided function {}. Are you sure this is the right view_function?".format(p, view_function.__name__)
    # -----------------------------------------
    
    # We also can check, if no placeholders in rule, there must be either defaults in the callable or no args at all.
    n_default_args = 0 if view_function.__defaults__ is None else len(view_function.__defaults__)
    n_nondefault_args = len(func_input_args) - n_default_args
    if "self" in func_input_args: # ignore `self`
        # TODO: `self` is reserved,right, so self should not mean anyother thing?
        n_nondefault_args -= 1
    
    assert n_nondefault_args >= 1, "Make sure you view_function expects foremost argument of type Request, as `(r:Request, ...) after ignoring `self` if any, r would be generated based on the http environment!"
    for p in placeholders:
        assert p in func_input_args, "Expected {} to be an `input` argument for callable!".format(p)
    del placeholders

def on_extension(r:Request):
    print("i am extension!")
    return Response("ok", status = 200)

class SimpleApp():
    # WSGI app emulating, to be called with (Environ and start_response callable!)
    # NOTE: still experimental, idea is to make it complete enough to easily map python code to a url, with werkzeug alone.
    # TODO: handle `options` and `cors`!
    def __init__(self, allow_local_cors:bool = False):
        self.initialized = False
        self.http_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        
        self.url_map = None # we will lazily initialize it!
        self.endpoint_2_uri:dict[str, tuple[Rule, list[str]]] = {}
        self.endpoint_2_viewFunction:dict[str, Callable] = {}

        # registered extensions. Multiple extensions could be developed independently and can be registed through a "main/master" app in a single desired location!
        self.extension_prefix = "ext" # as apps would be registered/available at <base_url>/ext/<app_name>/<app_rules> defined!
        self.registered_extensions:dict[str, SimpleApp] = {}

        # cors (experimental and never in production!!)
        self.allow_local_origin_cors = allow_local_cors
        # NOTE: not supposed to be turned ON, as it is supposed to be run at a local-interface only.
        # set this manually to true, if running only behind NAT  or own the consequences!!
        self.allow_wildcard_origin_cors = False

        # to sync/serialize some code, like initialization, as we would lazily initialize..!
        self.r_lock = threading.RLock()

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

        assert not (endpoint in self.endpoint_2_uri)
        for m in methods:
            assert m in self.http_methods

        validate_signature(rule, view_function)

        self.endpoint_2_uri[endpoint] = (Rule(rule, endpoint = endpoint), methods)
        self.endpoint_2_viewFunction[endpoint]  = view_function
        self.initialized = False
    
    def initialize(self):
        self.url_map = Map(
                [(v[0]) for v in self.endpoint_2_uri.values()]
            )
        self.initialized = True

    def __call__(self, environ, start_response) -> Iterable[bytes]:
        with self.r_lock:
            # Since lazy/dynamic, we protect initialization, through lock, as could be interrupted, as ours is a threaded server!
            if not (self.initialized):
                print("[Initializing]: Parent")
                self.initialize()
            # making sure all registered extension are initialized too.
            for ext in self.registered_extensions:
                if not (self.registered_extensions[ext].initialized):
                    print("[Initializing]: {}".format(ext))
                    self.registered_extensions[ext].initialize()

        # print("[DEBUG]: Being called in thread: {}".format(threading.current_thread().ident))
        # NOTE: this environ is basically raw-bytes received on a socket. (depending upon the level in OSI model, assume for this HTTP protocol!)
        # NOTE: can assume this environ/data a new (not-shared) instance, and we generate raw-bytes purely on environ, so should be thread-safe, even without GIL( in-case we wish to experiment) ! 
        # start_response is created by WSGI server and passed according to WSGI protocol.

        # --------------------
        # Check for extension!
        # --------------------
        active_app = self
        extension_name = None
        temp_path = environ['PATH_INFO']
        temp_split = temp_path.split("/")
        if temp_split[1] == self.extension_prefix:
            # We aim to strip extension specific path, before calling registered extension (wsgi app).
            # This way extension doesn't need to worry in which context it is being called, and can be fully developed in isolation!
            extension_name = temp_split[2]
            assert extension_name in self.registered_extensions, self.registered_extensions.keys()
            print("[Routing to ]: {}".format(extension_name))
            extension_path = temp_path.replace("/{}/{}".format(self.extension_prefix, extension_name), "")
            print("extension path: {}".format(extension_path))

            # NOTE: we slightly modify the environ. (good enough for us! but be-careful, in case underlying representation changes!)
            # NOTE TODO: for now i am assuming the following 3 as equivalent !!
            environ['PATH_INFO'] = extension_path
            environ['REQUEST_URI'] = extension_path
            environ['RAW_URI'] = extension_path

            active_app = self.registered_extensions[extension_name]
        del temp_split, temp_path
        # -------------------------------------------

        # Start_response is about indicating the response start phase.
        # Mainly set the headers and status, conditioned on request being handled.
        # For example, if `streaming` is done, we can set the headers to indicate that.. main WSGI server would only need to read headers and status, without caring about what application code is doing.
        # return ["Hello World!".encode("utf8")]

        request = Request(environ = environ) # just wrapping up the environ to easily query various headers and stuff!        
        urls = active_app.url_map.bind_to_environ(environ) # try to match environment/url to one of endpoints defined for this app.
        
        endpoint, args = urls.match()
        assert not (endpoint is None)
        expected_methods = active_app.endpoint_2_uri[endpoint][1]

        if (request.method == "OPTIONS"):
            # Reference: https://fetch.spec.whatwg.org/
            # NOTE: for now CORS work at `origin` level, i.e would be allowed for all methods/resources , but in future can easily be set up for combination of origins and resources!
            # TODO: prevent cookies submission to cross origins !
            if self.allow_local_origin_cors or self.allow_wildcard_origin_cors:
                # TODO: later it can be done for a specific URL/route while creating/adding a rule!
                response = Response(status = 200)
                h = response.headers # h is mutable reference, so updates would be reflected in response.headers too!
                max_age = 86400
                
                if self.allow_local_origin_cors and (not self.allow_wildcard_origin_cors):
                    # Cors request to interfaces like http://192.168.xxx.xxx, should be blocked too, if server was running on multiple interfaces in case of a CORS request!!
                    # As in it is possible that script originate from questionable origin, may try to request a local-source in case such a server is running!
                    # origin and destination both must be local!
                    assert environ['SERVER_NAME'] == "localhost" or environ['SERVER_NAME'] == "127.0.0.1", "Please run server on `local` interface only, or set `local_origin_cors` to False, at your own risk!!"
                    if "Origin" in request.headers: # browser would pass this in any cross-origin request!
                        script_origin_host = request.headers["origin"].split(":")[0].lower()
                        print("Origin host: {}".format(script_origin_host))
                        assert  "127.0.0.1" in script_origin_host or "localhost" in script_origin_host, "Cannot allow scripts from origins other than `local`"

                if "Origin" in request.headers:
                    # It is expected for a CORS/Options generally !
                    script_origin = request.headers["Origin"]
                    h['Access-Control-Allow-Origin'] = script_origin
                h['Access-Control-Allow-Methods'] = ",".join(expected_methods)
                h['Access-Control-Max-Age'] = str(max_age)

                # minimal preflight requests checking, its ok, TODO: may need to extend it!
                # 1. already set `access-control-allow-methods` to allowed methods for this resource!
                if 'Access-Control-Request-Headers' in request.headers: 
                    # NOTE / TODO: here can check if request headers make sense!
                    # in case a script, is setting some custom header!
                    print("[WARNING]: Custom headers are not expected for now, TODO: expecting that browser will set this header, in case script would setting some custom header anyway !!! ")
                    h["Access-Control-Allow-headers"] = ",".join(["X-Session-Key"]) # an empty, TODO: fill them for only allowed headers!
            else:
                response = Response(status = 400) 
            
        elif not (request.method in expected_methods):
            # method not allowed exception! wanted to use MethodNotAllowed
            # i cannot figure out the usage of MethodNotAllowed anyway!
            response = Response("Not allowed ", status = 405)
        else:
            response = active_app.endpoint_2_viewFunction[endpoint](request, **args) # itself an wsgi app!  
            if "Origin" in request.headers:
                # TODO: Even After the OPTIONS request, it still needs to be set for actual request for CORS ? Server should take control for requests from cross-origin scripts !?
                # or may be add some mapping to get allowed origins given resource and origin value!
                script_origin = request.headers["Origin"]
                response.headers['Access-Control-Allow-Origin'] = script_origin

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

# CORS handling.
# idea is to inform client (browser) about scripts' permissions, those loaded from a different origin!
# based on the Customization by a script, browser can choose to send an OPTIONS/pre-flight request!

# h['Access-Control-Allow-Origin'] = origin
# h['Access-Control-Allow-Methods'] = get_methods()
# h['Access-Control-Max-Age'] = str(max_age)
# if headers is not None:
#     h['Access-Control-Allow-Headers'] = headers

if __name__ == "__main__":
    from werkzeug.serving import run_simple
    from werkzeug.test import create_environ

    app = SimpleApp(allow_local_cors = True)
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
    gp.add_url_rule(rule = "/test", view_function= on_extension)
    # -------

    app.register(
        gp,
        name = "gp"
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
    result = c.get("http://localhost:8080/api/52") # let us see what happens!
    result = c.options("http://localhost:8080/ext/gp/test")
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