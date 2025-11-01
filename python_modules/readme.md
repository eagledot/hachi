# Self-contained Pure-python modules.

## Werkzeug:
    Modified `threading` class, instead to handle request using a thread-pool and queue, rather than creating a new thread for each request. (supposed to stabIlize/smooth Os resources in case used on less-powerful hardware or on SBCS)
    
    Repo: https://github.com/pallets/werkzeug
    License: https://github.com/pallets/werkzeug/blob/main/LICENSE.txt

## Plum-py 
  https://gitlab.com/dangass/plum for Pack/Unpack Memory Bytes
  In the future this dependency could be deprecated, using native `struct` or custom python code. (required by Exif Module)

## Exif
 https://gitlab.com/TNThieding/exif Read and modify image EXIF metadata using Python without any third-party software dependencies
 Minor changes (by Anubhav N. (eagledot)) all under original MIT License .

## Ftfy:
Fixes mojibake and other glitches in Unicode text, after the fact.
By: Robyn Speer https://github.com/rspeer
Under Apache 2.0 license with no AI white-washing as mentioned at https://github.com/rspeer/python-ftfy/blob/main/LICENSE.txt


# Bootstraping Pip on windows.

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
