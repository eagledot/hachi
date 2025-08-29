## Self-contained modules.

# Flask:
    This repo contains, `3.0.3` flask version with some of the dependencies commented out , can be replaced with almost any version i think!

    Idea is to eventually use only `werkzeug` , as this is just supposed to be a pure API server, templating/cli and most of dependencies shouldn't be required.

    * Remove/commented `jinja` dependency.
    * remove/commented `its-dangerous` dependency.
    * removed/commented `click` dependency. (used for CLI!)

# Werkzeug:
    Modified `threading` class, instead to handle request using a thread-pool and queue, rather than creating a new thread for each request. (supposed to stabIlize/smooth Os resources in case used on less-powerful hardware or on SBCS)

