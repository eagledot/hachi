## Self-contained modules.

# Flask:
    This repo contains, `3.0.3` flask version with some of the dependencies commented out , can be replaced with almost any version i think!

    Idea is to eventually use only `werkzeug` , as this is just supposed to be a pure API server, templating/cli and most of dependencies shouldn't be required.

    * Remove/commented `jinja` dependency.
    * remove/commented `its-dangerous` dependency.
    * removed/commented `click` dependency. (used for CLI!)

# Werkzeug:
    Modified `threading` class, instead to handle request using a thread-pool and queue, rather than creating a new thread for each request. (supposed to stabIlize/smooth Os resources in case used on less-powerful hardware or on SBCS)


## Bootstraping Pip on windows.

In case we are using an embedded python version, we will first need to install/bootstrap `pip`. One of recommended way is by using `get-pip.py` as mentioned at https://pip.pypa.io/en/stable/installation/ [https://pip.pypa.io/en/stable/installation/]. This contains encoded `pip` package as zip file itself. Hence once downloaded and run, it will install `pip` into the `< embedded_python_folder >/lib/site-packages` directory.

```cmd
1. `cd` into the `root` of embedded python folder.
2 `mv` ./lib/site-packages/pip ./   (now can be used with -m flag)
3. ./python.exe -m pip --version
```

## Installing packages (on any OS!)
Now that `pip` is available, we can install required packages into an isolated directory, in this case it would be `python_modules`,  so that application becomes self-contained. This has to be done one time. 

* ./python.exe -m pip -e < desired directory > < package name >
