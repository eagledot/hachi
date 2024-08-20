# Package
version       = "0.1.0"
author        = "eagledot"
description   = "a nimble file to make compilation easier, contains task to run commands easily."
license       = "Apache 2.0 or BSD 3"
srcDir        = "src"

# Dependencies
requires "nim >= 1.6.0"

# Tasks
task compileTlsh, "native compilation with -d:danger and ARC as memory management":
  when defined(windows):
    exec("nim c --gc:arc -d:danger --threads:off --app:lib --out:tlsh_python_module.pyd ./tlsh_python_module.nim")
  else:
    exec("nim c --gc:arc -d:danger --threads:off --app:lib --out:tlsh_python_module.so ./tlsh_python_module.nim")
