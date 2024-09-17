# What
To collect necessary binaries to make it a packaged app in itself.
Like to store the portable python and caddy. 
(Atleast for windows and MacOs), On linux have to figure out a better way to package it , i guess.
Like an APPIMAGE or flatpack like stuff. (we will take a look at that later !)

Later these binaries would be spawned by the main/parent executable. before calling webview .

# TODO:
1. copy python executable (python + get_pip module)
2. then copy caddy also.
3. figure out the commands to run/spawn in the main executable.