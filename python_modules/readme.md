## Self-contained modules.

# Werkzeug:
    Modified `threading` class, instead to handle request using a thread-pool and queue, rather than creating a new thread for each request. (supposed to stabIlize/smooth Os resources in case used on less-powerful hardware or on SBCS)
    
    Repo: https://github.com/pallets/werkzeug
    License: https://github.com/pallets/werkzeug/blob/main/LICENSE.txt

## Bootstraping Pip on windows.

In case we are using an embedded python version, we will first need to install/bootstrap `pip`. One of recommended way is by using `get-pip.py` as mentioned at [https://pip.pypa.io/en/stable/installation/] (https://pip.pypa.io/en/stable/installation/) . This contains encoded `pip` package as zip file itself. Hence once downloaded and run, it will install `pip` into the `< embedded_python_folder >/lib/site-packages` directory.

```cmd
1. `cd` into the `root` of embedded python folder.
2 `mv` -r ./lib/site-packages/pip ./   (now can be used with -m flag)
3. ./python.exe -m pip --version
```

## Installing packages (on any OS!)
Now that `pip` is available, we can install required packages into an isolated directory, in this case it would be `python_modules`,  so that application becomes self-contained. This has to be done one time. 

```cmd
* ./python.exe -m pip --target <desired directory> < package name> 
>
```
