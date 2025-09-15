# Copy required static files to a remote_server.
# Making it easier to server static, content from a VPS, while upstream server could run on an edge hardware!
# Eventually idea is group all commands in this file to make it easier to set up VPS!

# Usage:
# `cd` to this directory.
# python vps_setup.py

# After running this script.
# Unzip <STATIC_ZIP_PATH.zip> # this should create a `static` in Current working directory.
# Point to this directory in NginX/caddy configuration to serve static files from.
# Make sure reverse_proxy points to tunnel/local-upstream-proxy !

VPS_IP  = "127.0.0.1"
SSH_PORT = 22    # default is 22
SSH_KEY_PATH = "" # Something like <xx_id_rsa>
STATIC_FILES_PATH = "../static" # recursive, BE SURE NOT TO PUT ANYTHING PRIVATE IN THIS !!
REMOTE_PARENT_DIRECTORY = "/var" # This will exist!
REMOTE_USER = "root"
REMOTE_NEW_DIRECTORY = "hachi-demo"
start_fresh = True     # will (try-to) delete any data in `/var/hachi-demo`, before copying new data!

import os
import time
assert os.path.exists(STATIC_FILES_PATH)

#-----------------------------------
def run_command_on_vps(command:str):
    assert isinstance(command, str)
    template = "ssh -p {} -i {} {}@{}".format(
        SSH_PORT,
        SSH_KEY_PATH,
        REMOTE_USER,
        VPS_IP
    )
    os.system("{} {}".format(template, command))

# ------------
# Delete older data if any!
if start_fresh:
    # double check this !
    run_command_on_vps("rm -rf {}/{}".format(REMOTE_PARENT_DIRECTORY, REMOTE_NEW_DIRECTORY))
    run_command_on_vps("rmdir {}/{}".format(REMOTE_PARENT_DIRECTORY, REMOTE_NEW_DIRECTORY))

#----------------------------------
print("creating directory on remote server")
run_command_on_vps("mkdir {}/{}".format(REMOTE_PARENT_DIRECTORY, REMOTE_NEW_DIRECTORY))

tic = int(time.time())
STATIC_ZIP_PATH = "{}_{}.zip".format("static_hachi_images", "121212") # default `zip` will update or add, so much faster!, it doesn't delete older enteries though! 
# Recursive zip. (this will generate required .zip file to copy to remote server)
print("Zipping recursively {} to {}".format(os.path.abspath(STATIC_FILES_PATH), STATIC_ZIP_PATH))
os.system("zip -r {} {}".format(STATIC_ZIP_PATH, STATIC_FILES_PATH))

# copy 
print("Secure copying {} to: {}".format(STATIC_ZIP_PATH, REMOTE_PARENT_DIRECTORY))
# Like `scp -i <path/to/key> ./static_xx.zip root@127.0.0.1:/var`
# Note: capital P with scp, little p with ssh for port!
copy_to_vps_command = "scp -P {} -i {} {} {}@{}:{}".format(
        SSH_PORT,
        SSH_KEY_PATH,
        STATIC_ZIP_PATH,
        REMOTE_USER,
        VPS_IP,
        "{}/hachi-demo".format(REMOTE_PARENT_DIRECTORY) 
        )
os.system(copy_to_vps_command)

# remove the `zip` file generated.
print("Removing/deleting {}".format(STATIC_ZIP_PATH))
os.system("rm {}".format(STATIC_ZIP_PATH))

# unzip on remote server.
print("unzipping...")
run_command_on_vps("unzip /var/hachi-demo/{} -d /var/hachi-demo".format(STATIC_ZIP_PATH))

# delete the .zip file
run_command_on_vps("rm /var/hachi-demo/{}".format(STATIC_ZIP_PATH))

# tunnel
# From remote(VPS) port to our local-instance
TUNNEL_REMOTE_PORT = 8200  # reverse_proxy 127.0.0.1:<THIS_PORT> for caddy config.
TUNNEL_LOCAL_PORT = 8200   # Port at which our local server would be running on!

# NOTE: by default only packets originating from `loopback/local` interface are forwarded by tunnel.
# Either set gatewayport in sshd config to yes, or bind to `0.0.0.0:<tunnel_remote_port>`!

# This is OK, since caddy/frontend after stripping tls, would be forwarding packets, i.e hence locally originated!
# f option to fork in the background.
# -N Do not execute a remote command. This is useful for just forwarding ports!
# -C option could be used to compress (only helpful for slower connections according to manual!)
# TODO: no easy way to kill the ongoing tunnel, calling with same port would result in failure, due to already running tunnel??
# NOTE: autossh, seems to be working Okay, easier on kill session/tunnel on Unix !?
tunneling_command = "ssh -R {}:127.0.0.1:{} -f -N -i {} {}@{}".format(
    TUNNEL_REMOTE_PORT,
    TUNNEL_LOCAL_PORT,
    SSH_KEY_PATH,
    REMOTE_USER,
    VPS_IP
)
# os.system(tunneling_command)

# Further (After tunnel has been set up):
# 0. unzip that `STATIC_ZIP_PATH` on the remote server!
# can i send that command using `ssh`
# 1. Run the caddy server (with file_server root as /var/static and reverse_proxy to 127.0.0.1:TUNNEL_REMOTE_PORT)
# 2. Make sure local-server is running!
# 