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
SSH_KEY_PATH = "" # Something like <xx_id_rsa>
STATIC_FILES_PATH = "../static" # recursive, BE SURE NOT TO PUT ANYTHING PRIVATE IN THIS !!
REMOTE_STATIC_PARENT_DIRECTORY = "/var" # This will exist!
REMOTE_USER = "root"

import os
import time
assert os.path.exists(STATIC_FILES_PATH)

tic = int(time.time())
STATIC_ZIP_PATH = "./{}_{}.zip".format("static_hachi_images", tic)
# Recursive zip. (this will generate required .zip file to copy to remote server)
print("Zipping recursively {} to {}".format(os.path.abspath(STATIC_FILES_PATH), STATIC_ZIP_PATH))
os.system("zip -r {} {}".format(STATIC_ZIP_PATH, STATIC_FILES_PATH))

# copy 
# Like `scp -i <path/to/key> ./static_xx.zip root@127.0.0.1:/var`
copy_to_vps_command = "scp -i {} {} {}@{}:{}".format(
        SSH_KEY_PATH,
        STATIC_ZIP_PATH,
        REMOTE_USER,
        VPS_IP,
        REMOTE_STATIC_PARENT_DIRECTORY 
        )
# os.system(copy_to_vps_command)

# remove the `zip` file generated.
print("Removing/deleting {}".format(STATIC_ZIP_PATH))
os.system("rm {}".format(STATIC_ZIP_PATH))

# tunnel
# From remote(VPS) port to our local-instance
TUNNEL_REMOTE_PORT = 5000  # reverse_proxy 127.0.0.1:<THIS_PORT> for caddy config.
TUNNEL_LOCAL_PORT = 8200   # Port at which our local server would be running on!

# NOTE: by default only packets originating from `loopback/local` interface are forwarded by tunnel.
# Either set gatewayport in sshd config to yes, or bind to `0.0.0.0:<tunnel_remote_port>`!

# This is OK, since caddy/frontend after stripping tls, would be forwarding packets, i.e hence locally originated!
# f option to fork in the background.
# -N Do not execute a remote command. This is useful for just forwarding ports!
# -C option could be used to compress (only helpful for slower connections according to manual!)
# TODO: no easy way to kill the ongoing tunnel, calling with same port would result in failure, due to already running tunnel??
tunneling_command = "ssh -R {}:127.0.0.1:{} -f -N -i {} {}@{}".format(
    TUNNEL_REMOTE_PORT,
    TUNNEL_LOCAL_PORT,
    SSH_KEY_PATH,
    REMOTE_USER,
    VPS_IP
)
# os.system(tunneling_command)
