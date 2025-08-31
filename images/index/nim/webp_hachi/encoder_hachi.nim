# Extended routines by using Lower/advanced API exposed by WebP.
# Ideas:
# 1. provide our own buffers where possible, depending on the context, where it is used. 
# like if we already have raw-data in desired format..we can directly refer that in `picture` , than copying..
# also putting data back into our own desired buffer, so as to reduce copying..

# 2. 

# check architecture dynamically!
let test_0:uint32 = 1
let is_little_endian = cast[ptr array[4, uint8]](addr test_0)[0] == 1
doAssert is_little_endian, "Expected to be little Endian, as WebP Picture format is coded `b,g,r,a`. Raise an issue on https://github.com/eagledot/hachi !"

type
    ColorFormat* = enum
        RGB
        BGR
        RGBA
        BGRA


# -------------------------------------------------------------------------------------
# WebP Encoding, of Rgba(also support bgra, rgb,bgr ) data.
# ------------------------------------------------------------ 
import nimwebp/encoder  # it compiles all the original C sources directly, too!
import nimPNG
import streams, times


var encoded_data_size:Natural # global, we reset it at start of each encode rgba. (global, otherwise, could be provided as user_data field or something, if later resorts to multi-threading!)
proc myMemoryWriter(data: ptr uint8, size: cint, pic: ptr WebPPicture): cint {.cdecl.} =
    # Just writes the compressed data to a user-provide buffer!
    # pic.custom_ptr is set to during setting up container, along with writer!
    # echo "Got some data: ", size
    copyMem(cast[pointer](cast[int](pic.custom_ptr) + encoded_data_size), data, size)
    encoded_data_size += size.Natural
    return 1 # use this to indicate, to keep webp going.. if some unexpected thing occured, set 0.

proc encode_webp*(
    # input data properties.
    image_packed:ptr UncheckedArray[uint8],  # we are assuming packed data.. (so size = (height * width * 4) bytes!)
    height:int,
    width:int,
    color_format:ColorFormat = RGB,  # input image color format!

    # buffers
    # Note: depending on the data-type, we may need to copy the rgba_packed, into a new buffer(either allocated by webP or provided by user!)
    encoded_data_buffer:ptr UncheckedArray[uint8], # user provided buffer to put the encoded data in.. must be big enough .(sure value is 16384 * 16384 * 4) 

    # config parameters!
    quality:float = 100,
    lossless:bool = true,
    meth:int  = 2,     # [0-6] 0 means faster compression but larger size, 6 means best possible compression but slower!  -1 to let `config_preset` decide it. 
    exact:bool = true  # related to rgb data for transparent pixels!
):Natural =

    # For little-endian, it would be best if input-data already in `B,G,R,A` format, for big-endian, `A,R,G,B` would be best!
    # Even if not, we fill the picture/container in this FORMAT .
    var has_alpha:bool = false
    var swap_rb = false           # by default, we expect RGB data format!
    if color_format == RGB:
        has_alpha = false
        swap_rb = false   # logic expects `rgb` by default, don't be confused, as said we would be putting, data always in `b,g,r,a` on little endian!
    elif color_format == BGR:
        has_alpha = false
        swap_rb = true
    elif color_format == BGRA:
        has_alpha = true
        swap_rb = true
    elif color_format == RGBA:
        has_alpha = true
        swap_rb = false
    else:
        doAssert 3 == 4, "Not supported for now: " & $color_format


    doAssert not isNil(image_packed)
    # Return the size of compressed data...
    doAssert not isNil(encoded_data_buffer), "Provide a big-enough buffer to hold the compressed/encoded-data!"

    encoded_data_size = 0   # this would be updated by call-back. BY DEFAULT ONLY 1 THREAD Is expected to call `encode_image` routine from python OR Nim for now!
    # ---------------------------------------------------
    # set up the config, by preseting, for PHOTO type, and then over-writing some of the valueS!
    var config:WebPConfig
    doAssert webpConfigPreset(addr config, WEBP_PRESET_DEFAULT, quality) != 0, "Failed to preset configuration"
    #overwrite provided values!
    config.lossless = cint(lossless)
    config.quality = float32(quality)
    config.exact  = cint(exact)
    
    if meth != -1:
        config.meth = meth.cint  # we overwrite with user provided one!
    doAssert config.meth >= 0 and config.meth <= 6
    # --------------------------------------------

    # -----------------------
    # Set up the picture container! 

    var pic:WebpPicture
    doAssert webpPictureInit(addr pic) != 0

    pic.use_argb = 1     # by default is YUV color space, but we generally would have data in rgb formats!
    pic.width = width.cint
    pic.height = height.cint 
    pic.writer = myMemoryWriter #(Callback as compressed data becomes available) writing data to a file or in-memory buffer!
    pic.custom_ptr = cast[pointer](encoded_data_buffer)  # to be used in `writer` (basically passing some data, to be used by callback)

    # allocate necessary memory to put the input rgba data!
    var webp_own_memory = true
    if is_little_endian and color_format == BGRA:
        # we can directly assign the input buffer to picture to read from.
        # Goes without saying, this input buffer must be kept alive and not-mutated, when webP would be reading from it! 
        doAssert (cast[int](image_packed) mod 32) == 0, "aligned pointer is expected by webp!"

        # we do what wepPictureAlloc would have done!
        pic.argb = cast[ptr uint32](image_packed)
        pic.memory_argb = cast[pointer](image_packed)  # by default nimwebp don't export this.. do it manually if compiled on another machine!
        pic.argb_stride = width.cint   # Don't forget this.. it is set by `webpPictureAlloc` otherwise! 
        webp_own_memory = false
    else:
        # NOTE: let webp allocate, the space for putting `input image` into a picture container, 
        # we can provide our own buffer.. but its already too many user buffers, i am tired! 
        doAssert webpPictureAlloc(addr pic) != 0, "Failed to allocate, Memory !!!!" 

    # --------------------------------------------------
    # Import/fill the data into webp picture buffer ...
    # NOTE: Since `argb` data, is a uint32 type, to mapping to `individual bytes` would depend on `endianness`!
    var r_offset = 2
    var b_offset = 0
    if swap_rb == true:
        r_offset = 0
        b_offset = 2
    
    # on little-endian # [b,g,r,a] data can be used without no copying!
    if not (is_little_endian and color_format == BGRA): # Do we need to copy the into picture container!
        let channels = (3 + has_alpha.int)
        var counter:int = 0
        let pic_ptr = cast[ptr UncheckedArray[uint8]](pic.argb)
        for i in 0..<(width * height):
            # expected format for pic argb format!
            # b-g-r-a(little endian, (webp stores this in a uint32 type)) , from r-g-b-a
            # a-r-g-b(order on big-endian)
            let temp = i*channels
            pic_ptr[counter] = image_packed[temp + r_offset] # reading b value .
            pic_ptr[counter + 1] = image_packed[temp + 1] # g
            pic_ptr[counter + 2] = image_packed[temp + b_offset] # r
            if has_alpha:
                pic_ptr[counter + 3] = image_packed[temp + 3]  # alpha
            else:
                pic_ptr[counter + 3] = 255'u8
            counter += 4
    # ------------------------------------------------------

    # now container is filled with data.. to be encoded/compressed!
    doAssert webpEncode(addr config, addr pic) != 0

    if webp_own_memory == false:
        pic.argb = nil
        pic.memory_argb = nil
    doAssert webpPictureFree(addr pic) != 0 # still call this, i think even with `use_argb` `pic.memory` is being allocated internally somewhere!

    result = encoded_data_size
    return result

# -------------------------------------------------------------------
