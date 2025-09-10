# --------------------------------------------------------------------
#  Original License and Author (we will do minor tweaks if required, under the SAME (PUBLIC DOMAIN license))
# File:         stb_image/read.nim
# Author:       Benjamin N. Summerton (define-private-public)
# License:      Unlicense (Public Domain)
# Description:  A nim wrapper for stb_image.h.  The reading ops
# --------------------------------------------------------------

# --------------------------------------------------------------
# Changes by Anubhav N. (eagledot), under the original License (Public Domain)
# ----------------------------------------------------------------

import ./components
export components.Default
export components.Grey
export components.GreyAlpha
export components.RGB
export components.RGBA

when defined(windows) and defined(vcc):
  {.pragma: stbcall, stdcall.}
else:
  {.pragma: stbcall, cdecl.}

# Include the header
{.compile: "./read.c".}

# Need to link the math library
when defined(Posix) and not defined(haiku):
  {.passl: "-lm".}


# Custom exception, only for image reading errors
type
  STBIException* = object of Exception


# NOTE: this function is here for completness, but it's not exposed in the
#       nim-friendly API, since seq[byte] are GC'd
proc stbi_image_free(retval_from_stbi_load: pointer)
  {.importc: "stbi_image_free", stbcall.}

proc stbi_failure_reason(): cstring
  {.importc: "stbi_failure_reason", stbcall.}


## Get an error message for why a read might have failed.  This is not a
## threadsafe function.
proc failureReason*(): string =
  return $stbi_failure_reason()

# ==================
# 8 bits per channel
# ==================

proc stbi_load(
  filename: cstring;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cuchar
  {.importc: "stbi_load", stbcall.}

proc stbi_load_from_memory(
  buffer: ptr UncheckedArray[uint8];
  len: cint;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cuchar
  {.importc: "stbi_load_from_memory", stbcall.}

# Right now I'm not planning on using the callback functions, but if someone
# requests it (or provides a pull request), I'll consider adding them in.
#stbi_uc *stbi_load_from_callbacks(stbi_io_callbacks const *clbk, void *user, int *x, int *y, int *channels_in_file, int desired_channels);

proc stbi_load_from_file(
  f: File;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cuchar
  {.importc: "stbi_load_from_file", stbcall.}


## This takes in a filename and will return a sequence (of unsigned bytes) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
proc load*(filename: string,
    buffer:ptr UncheckedArray[uint8],  # user-provided buffer to put the decoded-data in!
    buffer_size:Natural,             # must be big-enough to hold the data!
    leave_alpha:bool = false
    ): tuple[flag:bool, shape:tuple[height:int, width:int, channels:int]] =

  # NOTE: modified version of `load` from `read.nim`

  var
    width: cint
    height: cint
    components: cint

  let desired_channels:int = 0 #    auto-detection, 
  # Read
  let data = stbi_load(filename.cstring, 
    width, 
    height, 
    components, 
    desired_channels.cint)

  # Check for a bad read
  if isNil(data):
    result.flag = false
    result.shape = (height:0, width:0, channels:0)
    return result

  let actual_channels = if desired_channels > 0: desired_channels else: components.int
  let expected_buffer_size = (width.int * height.int * actual_channels.int)
  doAssert expected_buffer_size <= buffer_size, "Not enough capacity for user-buffer to put data in"

  # Copy pixel data, TODO: may be we can modify the C source, instead to put data into user-buffer by passing (alloc + copy + free) cost!
  var final_channels = actual_channels    
  if leave_alpha == true:
    final_channels = min(actual_channels, 3)
    for i in 0..<(height * width):
      for k in 0..<final_channels:
        buffer[i*final_channels + k] = cast[ptr UncheckedArray[uint8]](data)[i*actual_channels + k]
  else:
    copyMem(buffer, data, expected_buffer_size)


  # Free loaded image data
  stbi_image_free(data)

  result.flag = true
  result.shape = (height:height.int, width:width.int, channels:final_channels)
  return result

## This takes in a sequences of bytes (of an image file)
## and will return a sequence (of unsigned bytes) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
proc load_from_memory*(
  # input image-raw (Encoded) data
  image_encoded: ptr UncheckedArray[uint8],  # encoded image data!
  image_encoded_size:Natural,   # in bytes/uint8

  # user-provided buffer to put (decoded) data into 
  buffer:ptr UncheckedArray[uint8],  # user-provided buffer to put the decoded-data in!
  buffer_size:Natural,             # must be big-enough to hold the data!
  
  leave_alpha:bool = false     # if alpha (last-channel) present, we can choose to leave it !
  
  ):tuple[flag:bool, height:int, width:int, channels:int]=

  # NOTE: modified version of `load_from_memory` from `read.nim`

  var
    # Return values
    width: cint
    height: cint
    components: cint

  let desired_channels:int = 0 #    auto-detection, 

  # Read
  let data = stbi_load_from_memory(
    image_encoded, 
    image_encoded_size.cint, 
    width, 
    height, 
    components, 
    desired_channels.cint)

  # Check for a bad read
  if isNil(data):
    result.flag = false
    result.height = 0 
    result.width = 0
    result.channels = 0
    return result

  # set meta-data
  let actual_channels = if desired_channels > 0: desired_channels else: components.int
  let expected_buffer_size = (width.int * height.int * actual_channels.int)
  doAssert expected_buffer_size <= buffer_size, "Not enough capacity for user-buffer to put data in"

  # copy decoded data into user buffer!
  var final_channels = actual_channels    
  if leave_alpha == true:
    final_channels = min(actual_channels, 3)
    for i in 0..<(height * width):
      for k in 0..<final_channels:
        buffer[i*final_channels + k] = cast[ptr UncheckedArray[uint8]](data)[i*actual_channels + k]
  else:
    copyMem(buffer, data, expected_buffer_size)

  # Free loaded image data (internal stbi buffer!)
  stbi_image_free(data)

  result.flag = true
  result.height = height.int
  result.width = width.int 
  result.channels = final_channels.int
  return result



## This takes in a File and will return a sequence (of unsigned bytes) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
##
## This will also close the file handle too.
proc loadFromFile*(f: File, x, y, channels_in_file: var int, desired_channels: int): seq[byte] =
  var
    width: cint
    height: cint
    components: cint

  # Read
  let data = stbi_load_from_file(f, width, height, components, desired_channels.cint)

  # Check for a bad read
  if data == nil:
    raise newException(STBIException, failureReason())

  # Set the returns
  x = width.int
  y = height.int
  channels_in_file = components.int

  let actual_channels = if desired_channels > 0: desired_channels else: components.int

  # Copy pixel data
  var pixelData: seq[byte]
  newSeq(pixelData, x * y * actual_channels)
  copyMem(pixelData[0].addr, data, pixelData.len)

  # Free loaded image data
  stbi_image_free(data)

  return pixelData



# ===================
# 16 bits per channel
# ===================

proc stbi_load_16(
  filename: cstring;
  x, y, channels_in_file: var cint,
  desired_channels: cint
): ptr cushort
  {.importc: "stbi_load_16", stbcall.}

proc stbi_load_from_file_16(
  f: File;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cushort
  {.importc: "stbi_load_from_file_16", stbcall.}

proc stbi_load_16_from_memory(
  buffer: ptr cuchar;
  len: cint;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cushort
  {.importc: "stbi_load_16_from_memory", stbcall.}


## This takes in a filename and will return a sequence (of unsigned shorts) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
##
## This is used for files where the channels for the pixel data are encoded as
## 16 bit integers (e.g. some Photoshop files).
proc load16*(filename: string; x, y, channels_in_file: var int; desired_channels: int): seq[uint16] =
  var
    width: cint
    height: cint
    components: cint

  # Read
  let data = stbi_load_16(filename.cstring, width, height, components, desired_channels.cint)

  # Check for a bad read
  if data == nil:
    raise newException(STBIException, failureReason())

  # Set the returns
  x = width.int
  y = height.int
  channels_in_file = components.int

  let actual_channels = if desired_channels > 0: desired_channels else: components.int

  # Copy pixel data
  var pixelData: seq[uint16]
  newSeq(pixelData, x * y * actual_channels)
  copyMem(pixelData[0].addr, data, pixelData.len)

  # Free loaded image data
  stbi_image_free(data)

  return pixelData


## This takes in a File and will return a sequence (of unsigned shorts) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
##
## This will also close the file handle too.
##
## This is used for files where the channels for the pixel data are encoded as
## 16 bit integers (e.g. some Photoshop files).
proc loadFromFile16*(f: File; x, y, channels_in_file: var int; desired_channels: int): seq[uint16] =
  var
    width: cint
    height: cint
    components: cint

  # Read
  let data = stbi_load_from_file(f, width, height, components, desired_channels.cint)

  # Check for a bad read
  if data == nil:
    raise newException(STBIException, failureReason())

  # Set the returns
  x = width.int
  y = height.int
  channels_in_file = components.int

  let actual_channels = if desired_channels > 0: desired_channels else: components.int

  # Copy pixel data
  var pixelData: seq[uint16]
  newSeq(pixelData, x * y * actual_channels)
  copyMem(pixelData[0].addr, data, pixelData.len)

  # Free loaded image data
  stbi_image_free(data)

  return pixelData


## This takes in a sequences of unsigned short (of an image file)
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
##
## This is used for files where the channels for the pixel data are encoded as
## 16 bit integers (e.g. some Photoshop files).
proc load16FromMemory*(buffer: seq[byte]; x, y, channels_in_file: var int; desired_channels: int): seq[uint16] =
  var
    # Cast the buffer to another data type
    castedBuffer = cast[ptr cuchar](buffer[0].unsafeAddr)

    width: cint
    height: cint
    components: cint

  # Read
  let data = stbi_load_16_from_memory(castedBuffer, buffer.len.cint, width, height, components, desired_channels.cint)

  # Check for a bad read
  if data == nil:
    raise newException(STBIException, failureReason())

  # Set the returns
  x = width.int
  y = height.int
  channels_in_file = components.int

  let actual_channels = if desired_channels > 0: desired_channels else: components.int

  # Copy pixel data
  var pixelData: seq[uint16]
  newSeq(pixelData, x * y * actual_channels)
  copyMem(pixelData[0].addr, data, pixelData.len)

  # Free loaded image data
  stbi_image_free(data)

  return pixelData



# =======================
# Float channel interface
# =======================

proc stbi_loadf(
  filename: cstring;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cfloat
  {.importc: "stbi_loadf", stbcall.}

proc stbi_loadf_from_memory(
  buffer: ptr cuchar;
  len: cint;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cfloat
  {.importc: "stbi_loadf_from_memory", stbcall.}

# The callback functions are going to be skipped (see the README.md)
#float *stbi_loadf_from_callbacks(stbi_io_callbacks const *clbk, void *user, int *x, int *y, int *channels_in_file, int desired_channels);

proc stbi_loadf_from_file(
  f: File;
  x, y, channels_in_file: var cint;
  desired_channels: cint
): ptr cfloat
  {.importc: "stbi_loadf_from_file", stbcall.}


## This takes in a filename and will return a sequence (of 32 bit floats) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
proc loadF*(filename: string; x, y, channels_in_file: var int; desired_channels: int): seq[float32] =
  var
    width: cint
    height: cint
    components: cint

  # Read
  let data = stbi_loadf(filename.cstring, width, height, components, desired_channels.cint)

  # Check for a bad read
  if data == nil:
    raise newException(STBIException, failureReason())

  # Set the returns
  x = width.int
  y = height.int
  channels_in_file = components.int

  let actual_channels = if desired_channels > 0: desired_channels else: components.int

  # Copy pixel data
  var pixelData: seq[float32]
  newSeq(pixelData, x * y * actual_channels)
  copyMem(pixelData[0].addr, data, pixelData.len)

  # Free loaded image data
  stbi_image_free(data)

  return pixelData


## This takes in a sequences of bytes (of an image file)
## and will return a sequence (of 32 bit floats) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
proc loadFFromMemory*(buffer: seq[byte]; x, y, channels_in_file: var int; desired_channels: int): seq[float32] =
  var
    # Cast the buffer to another data type
    castedBuffer = cast[ptr cuchar](buffer[0].unsafeAddr)

    # Return values
    width: cint
    height: cint
    components: cint

  # Read
  let data = stbi_loadf_from_memory(castedBuffer, buffer.len.cint, width, height, components, desired_channels.cint)

  # Check for a bad read
  if data == nil:
    raise newException(STBIException, failureReason())

  # Set the returns
  x = width.int
  y = height.int
  channels_in_file = components.int

  let actual_channels = if desired_channels > 0: desired_channels else: components.int

  # Copy pixel data
  var pixelData: seq[float32]
  newSeq(pixelData, x * y * actual_channels)
  copyMem(pixelData[0].addr, data, pixelData.len)

  # Free loaded image data
  stbi_image_free(data)

  return pixelData


## This takes in a File and will return a sequence (of 32 bit floats) that
## is the pixel data. `x`, `y` are the dimensions of the image, and
## `channels_in_file` is the format (e.g. "RGBA," "GreyAlpha," etc.).
## `desired_channels` will attempt to change it to with format you would like
## though it's not guarenteed.  Set it to `0` if you don't care (a.k.a
## "Default").
##
## This will also close the file handle too.
proc loadFFromFile*(f: File, x, y, channels_in_file: var int, desired_channels: int): seq[float32] =
  var
    width: cint
    height: cint
    components: cint

  # Read
  let data = stbi_loadf_from_file(f, width, height, components, desired_channels.cint)

  # Check for a bad read
  if data == nil:
    raise newException(STBIException, failureReason())

  # Set the returns
  x = width.int
  y = height.int
  channels_in_file = components.int

  let actual_channels = if desired_channels > 0: desired_channels else: components.int

  # Copy pixel data
  var pixelData: seq[float32]
  newSeq(pixelData, x * y * actual_channels)
  copyMem(pixelData[0].addr, data, pixelData.len)

  # Free loaded image data
  stbi_image_free(data)

  return pixelData



# =============
# HDR functions
# =============

proc stbi_hdr_to_ldr_gamma(gamma: cfloat)
  {.importc: "stbi_hdr_to_ldr_gamma", stbcall.}

proc stbi_hdr_to_ldr_scale(scale: cfloat)
  {.importc: "stbi_hdr_to_ldr_scale", stbcall.}

proc stbi_ldr_to_hdr_gamma(gamma: cfloat)
  {.importc: "stbi_ldr_to_hdr_gamma", stbcall.}

proc stbi_ldr_to_hdr_scale(scale: cfloat)
  {.importc: "stbi_ldr_to_hdr_scale", stbcall.}

# The callback functions are going to be skipped (see the README.md)
#int stbi_is_hdr_from_callbacks(stbi_io_callbacks const *clbk, void *user);

proc stbi_is_hdr_from_memory(buffer: ptr cuchar; len: cint): cint
  {.importc: "stbi_is_hdr_from_memory", stbcall.}

proc stbi_is_hdr(filename: cstring): cint
  {.importc: "stbi_is_hdr", stbcall.}

proc stbi_is_hdr_from_file(f: File): cint
  {.importc: "stbi_is_hdr_from_file", stbcall.}


## Please see the "HDR image support" section in the `stb_image.h` header file
proc HDRToLDRGamma*(gamma: float) =
  stbi_hdr_to_ldr_gamma(gamma.cfloat)


## Please see the "HDR image support" section in the `stb_image.h` header file
proc HDRToLDRScale*(scale: float) =
  stbi_hdr_to_ldr_scale(scale.cfloat)


## Please see the "HDR image support" section in the `stb_image.h` header file
proc LDRToHDRGamma*(gamma: float) =
  stbi_ldr_to_hdr_gamma(gamma.cfloat)


## Please see the "HDR image support" section in the `stb_image.h` header file
proc LDRToHDRScale*(scale: float) =
  stbi_ldr_to_hdr_scale(scale.cfloat)


## Checks to see if an image is an HDR image, from memory (as a string of bytes)
proc isHDRFromMemory*(buffer: seq[byte]): bool =
  var castedBuffer = cast[ptr cuchar](buffer[0].unsafeAddr)
  return (stbi_is_hdr_from_memory(castedBuffer, buffer.len.cint) == 1)


## Checks to see if an image, with the given filename, is an HDR image.
proc isHDR*(filename: string): bool =
  return (stbi_is_hdr(filename.cstring) == 1)


## Checks to see if an image is an HDR image, from a File pointer.
proc isHDRFromFile*(f: File): bool =
  return (stbi_is_hdr_from_file(f) == 1)



# ==============
# Info Functions
# ==============

proc stbi_info_from_memory(
  buffer: ptr cuchar;
  len: cint;
  x, y, comp: var cint
): cint
  {.importc: "stbi_info_from_memory", stbcall.}

# NOTE: I am skipping callback functions unless there is a demand for them
#int stbi_info_from_callbacks(stbi_io_callbacks const *clbk, void *user, int *x, int *y, int *comp);

proc stbi_info(
  filename: cstring;
  x, y, comp: var cint
): cint
  {.importc: "stbi_info", stbcall.}

proc stbi_info_from_file(
  f: File;
  x, y, comp: var cint
): cint
  {.importc: "stbi_info_from_file", stbcall.}


## Querys a buffer to see if that data is a loadable image and get it's
## dimensions.  Returns true if stb_image can load this image, false otherwise.
proc infoFromMemory*(
  buffer: ptr UncheckedArray[uint8], # pointing to image raw (Encoded as jpg/png/..) data!
  len:int       # buffer length
  ): tuple[flag:bool, shape:tuple[height:int, width:int, channels:int]] =
  var
    width: cint
    height: cint
    channels: cint
    r = stbi_info_from_memory(cast[ptr cuchar](buffer), len.cint, width, height, channels)

  # Set the data and return
  result.shape.width = width.int
  result.shape.height = height.int
  result.shape.channels = channels.int
  result.flag  = (r == 1)
  return result


## Querys a filename to see if that file is a loadable image and get it's
## dimensions.  Returns true if stb_image can load this image, false otherwise.
proc info*(filename: string; x, y, comp: var int): bool =
  var
    width: cint
    height: cint
    channels: cint
    r = stbi_info(filename.cstring, width, height, channels)

  # Set the data & return
  x = width.int
  y = height.int
  comp = channels.int
  return (r == 1)


## Querys a File pointer to see if that file is a loadable image and get it's
## dimensions.  Returns true if stb_image can load this image, false otherwise.
##
## This will also close the file handle.
proc infoFromFile*(f: File; x, y, comp: var int): bool =
  var
    width: cint
    height: cint
    channels: cint
    r = stbi_info_from_file(f, width, height, channels)

  # Set the data & return
  x = width.int
  y = height.int
  comp = channels.int
  return (r == 1)



# ===============
# Extra Functions
# ===============

proc stbi_set_unpremultiply_on_load(flag_true_if_should_unpremultiply: cint)
  {.importc: "stbi_set_unpremultiply_on_load", stbcall.}

proc stbi_convert_iphone_png_to_rgb(flag_true_if_should_convert: cint)
  {.importc: "stbi_convert_iphone_png_to_rgb", stbcall.}

proc stbi_set_flip_vertically_on_load(flag_true_if_should_flip: cint)
  {.importc: "stbi_set_flip_vertically_on_load", stbcall.}


## From the header file: "For image formats that explicitly notate that they
## have premultiplied alpha, we just return the colors as stored in the file.
## set this flag to force unpremultiplication. results are undefined if the
## unpremultiply overflow.  This function acts globally, so if you use it once I
## recommend calling it again right after loading what you want.
proc setUnpremultiplyOnLoad*(unpremultiply: bool) =
  stbi_set_unpremultiply_on_load(if unpremultiply: 1 else: 0)


## From the header file: "indicate whether we should process iphone images back
## to canonical format."  This function acts globally, so if you use it once I
## recommend calling it again right after loading what you want.
proc convertIPhonePNGToRGB*(convert: bool) =
  stbi_convert_iphone_png_to_rgb(if convert: 1 else: 0)


## From the header file: "flip the image vertically, so the first pixels in the
## output array is the bottom left".  This function acts globally, so if you use
## it once, I recommend calling it again right after loading what you want.
proc setFlipVerticallyOnLoad*(flip: bool) =
  stbi_set_flip_vertically_on_load(if flip: 1 else: 0)



# =====================
# ZLIB Client Functions
# =====================

# C Wrapper procedures. Only these three are needed, all other only provide other default values
proc stbi_zlib_decode_malloc_guesssize_headerflag(buffer: ptr cuchar, len: cint, initial_size: cint,
  outlen: ptr cint, parse_header: cint): ptr cuchar {.importc: "stbi_zlib_decode_malloc_guesssize_headerflag", stbcall.}

proc stbi_zlib_decode_buffer(obuffer: ptr cuchar, olen: cint, ibuffer: ptr cuchar, ilen: cint): cint
  {.importc: "stbi_zlib_decode_buffer", stbcall.}

proc stbi_zlib_decode_noheader_buffer(obuffer: ptr cuchar, olen: cint, ibuffer: ptr cuchar, ilen: cint): cint
  {.importc: "stbi_zlib_decode_noheader_buffer", stbcall.}

## Uncompresses ``buffer`` and returns the decompressed data. Too parse a raw inflate stream
## switch parseheader to ``false``.
## It allocates a new buffer, which size is determined by ``initial_size``. If the buffer isn't sufficient
## it may be reallocated.
## For faster decompression, especially if you know the output size, use ``zlibDecodeBuffer``.
proc zlibDecodeMalloc*(buffer: openArray[byte], initial_size = 16384, parseheader = true): seq[byte] =
  var length = cint 0

  let data = stbi_zlib_decode_malloc_guesssize_headerflag(cast[ptr cuchar](unsafeAddr buffer[0]),
    cint buffer.len, cint initial_size, addr length, cint parseheader)

  # some error has occured
  if data.isNil:
    raise newException(STBIException, failureReason())

  result = newSeq[byte](int length)
  copyMem(addr result[0], data, length)

  stbi_image_free(data)

## Uncompresses the data from ``input`` and puts the uncompressed data into ``output``. It doesn't allocate
## nor resize any buffers.
## The amount of data written to ``output`` is returned.
## Switch ``parseheader`` to ``false`` to parse a raw deflate stream.
proc zlibDecodeBuffer*(input: openArray[byte], output: var openArray[byte], parseheader = true): Natural =
  let
    inputPtr = cast[ptr cuchar](output[0].addr)
    outputPtr = cast[ptr cuchar](input[0].unsafeAddr)
    bytesRead = (if not parseheader:
      stbi_zlib_decode_noheader_buffer(inputPtr, cint output.len, outputPtr, cint input.len) else:
      stbi_zlib_decode_buffer(inputPtr, cint output.len, outputPtr, cint input.len))
  # some error has occured
  if bytesRead == -1:
      raise newException(STBIException, failureReason())

  Natural(bytesRead)
