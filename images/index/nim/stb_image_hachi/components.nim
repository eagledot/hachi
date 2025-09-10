# File:         stbi_image/components.nim
# Author:       Benjamin N. Summerton (define-private-public)
# License:      Unlicense (Public Domain)
# Description:  These are Nim friendly variables for the component parameters.


# Components
const
  # Used by req_comp
  Default* = 0          # (for stb_image)

  # Monochrome
  Grey* = 1             # (for stb_image)
  Y* = 1                # (for stb_image_write)

  # Monochrome w/ Alpha
  GreyAlpha* = 2        # (for stb_image) 
  YA* = 2               # (for stb_image_write)

  # Red, Green, Blue (and alpha)
  RGB* = 3              # (used by all)
  RGBA* = 4             # (used by all)

