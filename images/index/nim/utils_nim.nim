# This is supposed to be collection of one-off routines, to speed up some logic, by better re-using the memory and stuff.
# Requires a LOT of effort and time, but should pay dividends, as most of this would be `source-code`, ready to be changed, as our understanding improves and time allows !
# Note: unless explicitly stated, expected to called from a single thread, either from python side or Nim !

# let png_path = "C://users/random/pictures/netflix.png"
# var png = loadPNG32(png_path) # this png data could come from python side!
# assert(not png.isnil, "image not loaded")

# # this buffer could come from python side..
# var buffer = c_malloc(csize_t(png.height * png.width * 4)) # more than enough to hold the compressed data!
# let buffer_size = encode_rgba(
#     cast[ptr UncheckedArray[uint8]](addr png.data[0]),
#     height = png.height,
#     width = png.width,
#     encoded_data_buffer = cast[ptr UncheckedArray[uint8]](buffer)
# )
# # write to the disk.
# echo buffer_size
# var strm = newFileStream("./xx.webp", fmWrite)
# strm.writeData(buffer, buffer_size)
# strm.close()

# c_free(buffer)

# --------------------------------------------
# Python APIs 
# ------------------------------------------
import webp_hachi/encoder_hachi   # encode_rgba
import stb_image_hachi/read_hachi       # load
import resize_hachi/resize              # resize

import nimpy
import nimpy / [raw_buffers, py_types]
import utils_gil

import os

proc initFuncPointers(){.exportpy.}=
    utils_gil.initFuncPointers()

proc encode_image(
    image_data:PyObject,  # containing packed image data.
    encoded_data:PyObject,  # put the encoded data to this buffer.
    color_format:ColorFormat, # input image color format/order!

    quality:float = 100,    # 100 means best!
    lossless:bool = true,    # set false, if lossy!
    meth:int = -1            # [0-6] 6 th slower but better, if -1 chosen during preset!
):int {.exportpy.} =
    # Return the size of compressed data, for given image data!
    # It will be used to truncate the encoded_data (at no cost) before returning from python side function. (so as to be easily later to a file if required!)

    # Inputs:
        # image_data: representing an packed image generally an numpy array, [H,W,C] (chanenls either 3 or 4),reshaping of gray-image, will not work! (as packed is expected)
        # encode_data: 1D numpy array to hold the compressed/encoded data big enough to hold the compressed data!
    # Returns:
        # the size of compressed data, so as to slice `encoded_data` array on python side !
    
    # Getting Buffer is enough to not to be collected by GC, until called `release`
    # inc_ref_count(image_data)
    # inc_ref_count(encoded_data)

    # Numpy objects support buffer protocol, so we get the underlying buffer!
    var 
        image_buf:RawPyBuffer
    image_data.getBuffer(image_buf, PyBUF_SIMPLE or PyBUF_ND)  # readable 
    doAssert image_buf.ndim.int == 3, "Supposed to be Color image, if gray, still re-pack it to be 3D first, may be be repeating planes!"
    var
        H = cast[ptr UncheckedArray[Py_ssize_t]](image_buf.shape)[0].int  
        W = cast[ptr UncheckedArray[Py_ssize_t]](image_buf.shape)[1].int
        C = cast[ptr UncheckedArray[Py_ssize_t]](image_buf.shape)[2].int
    doAssert C == 3 or C == 4, "Either 3 rgb channels, or 4th channel as alpha are allowed!"
    
    var encoded_buf:RawPyBuffer
    encoded_data.getBuffer(encoded_buf, PyBUF_WRITABLE or PyBUF_ND) # must support write!
    doAssert encoded_buf.ndim.int == 1, "Expected to be 1D array to hold compressed, encoded uint8/bytes!"


    let x_0 = cast[ptr UncheckedArray[uint8]](image_buf.buf)
    let x_1 = cast[ptr UncheckedArray[uint8]](encoded_buf.buf)
    # doAssert has_gil()
    var thread_state = saveThreadState() # save it in a local/private variable!

    # if channels = 3, has alpha to false.
    let compressed_data_size = encode_webp(
        image_packed = x_0,
        height = H,
        width = W, 
        color_format = color_format,
        encoded_data_buffer = x_1, # buffer to put the encoded data into!
        quality = quality,
        meth = meth,
        lossless = lossless
    )

    restoreThreadState(thread_state) # restore
    # doAssert has_gil()

    # release buffer, (so to decrement the reference count)
    encoded_buf.release()
    image_buf.release()

    # dec_ref_count(image_data)
    # dec_ref_count(encoded_data)

    return compressed_data_size.int

proc imread*(
    filepath:string,
    # can be reshaped.. it would still be C contiguous/packed!
    image_data:PyObject, # read the image-data into this buffer!,
    leave_alpha:bool = false
):tuple[flag:bool, shape:tuple[height:int, width:int, channels:int]] {.exportpy.} =

    # How to be used:
    # a numpy 1D buffer of big size , image
    # flag, (h,w,channels) = imread("xxx.png", image)
    # rgb = image[:size].reshape((h,w, channels))
    # assert isContiguous 

    assert os.existsFile(filepath) # do it on python side!

    var image_data_buf:RawPyBuffer
    image_data.getBuffer(image_data_buf, PyBUF_WRITABLE or PyBUF_ND) # must support write!
    doAssert image_data_buf.ndim.int == 1, "Expected to be 1D array, reshape it to 1D if not.. later reshape back after slicing (no-cost op!), still would be packed data!"
    let image_buffer_size = cast[ptr UncheckedArray[Py_ssize_t]](image_data_buf.shape)[0].int # TODO: get the size directly, what API?  

    # doAssert has_gil()   
    let x_0 = cast[ptr UncheckedArray[uint8]](image_data_buf.buf)
    # var thread_state = saveThreadState()

    let (flag, (h,w,channels)) = load(
        filepath,
        buffer = x_0,
        buffer_size = image_buffer_size,
        leave_alpha = leave_alpha
    )

    # restoreThreadState(thread_state)
    # doAssert has_gil()

    image_data_buf.release()

    result.flag = flag
    result.shape = (height:h,width:w,channels:channels)
    return result

proc imread_from_memory*(
    image_encoded:PyObject,    # encoded image raw-data, a bytes buffer!

    # can be reshaped.. it would still be C contiguous/packed!
    image_decoded:PyObject, # read the (decoded) image-data into this buffer!,
    leave_alpha:bool = false,
    flip_vertically:bool = false  # a global flag, so to reset, may need to call twice!
):tuple[flag:bool, height:int, width:int, channels:int] {.exportpy.} =

    # How to be used:
    # a numpy 1D buffer of big size , image
    # encoded = open("xxx.png", "rb").read()
    # decoded = np.empty(big_enough_size, dtype = np.uint8)
    # flag, (h,w,channels) = imread(encoded, decoded)
    # assert flag == True
    # rgb = decoded[:(h*w*channels)].reshape((h,w, channels))
    # assert decoded.flags.isContiguous 

    var image_encoded_buf:RawPyBuffer
    image_encoded.getBuffer(image_encoded_buf, PyBUF_SIMPLE or PyBUF_ND) # must support write!
    doAssert image_encoded_buf.ndim.int == 1, "Expected to be 1D array, reshape it to 1D if not.. later reshape back after slicing (no-cost op!), still would be packed data!"
    let image_encoded_size = cast[ptr UncheckedArray[Py_ssize_t]](image_encoded_buf.shape)[0].int # TODO: get the size directly, what API?  

    var image_decoded_buf:RawPyBuffer
    image_decoded.getBuffer(image_decoded_buf, PyBUF_WRITABLE or PyBUF_ND) # must support write!
    doAssert image_decoded_buf.ndim.int == 1, "Expected to be 1D array, reshape it to 1D if not.. later reshape back after slicing (no-cost op!), still would be packed data!"
    let image_buffer_size = cast[ptr UncheckedArray[Py_ssize_t]](image_decoded_buf.shape)[0].int # TODO: get the size directly, what API?  

    let x_0 = cast[ptr UncheckedArray[uint8]](image_encoded_buf.buf)
    let x_1 = cast[ptr UncheckedArray[uint8]](image_decoded_buf.buf)

    var thread_state = saveThreadState() # Release the GIL after saving this thread state!
    # doAssert has_gil() == false

    if flip_vertically:
        setFlipVerticallyOnLoad(true)

    result = load_from_memory(
        image_encoded = x_0,
        image_encoded_size = image_encoded_size,
        
        buffer = x_1,
        buffer_size = image_buffer_size,
        leave_alpha = leave_alpha
    )

    restoreThreadState(thread_state)
    # doAssert has_gil()

    image_encoded_buf.release()
    image_decoded_buf.release()

    if flip_vertically:
        # resetting to default!
        setFlipVerticallyOnLoad(false)
    return result


proc resize(
    image:PyObject,   # A 3D matrix of format [H,W,C] uint8 data, packed!
    resized_image:PyObject,  # updated in-place with the resized (uint8) data!    
    channel_conversion_info:ChannelConversion = SAME,
    tile_size:Natural = 1        # keep it 1 or a multiple of 4
){.exportpy.} =  

    # How to be used:
    # some image data say image_rgb
    # a numpy 3D buffer to put resized data into!
    # resize(image_rgb, resized_image)
    # assert isContiguous 

    var image_buf:RawPyBuffer
    image.getBuffer(image_buf, PyBUF_SIMPLE or PyBUF_ND)  # readable , This also increase reference count for this buffer!
    var resized_buf:RawPyBuffer
    resized_image.getBuffer(resized_buf, PyBUF_WRITABLE or PyBUF_ND)  

    var
        H = cast[ptr UncheckedArray[Py_ssize_t]](image_buf.shape)[0].int  
        W = cast[ptr UncheckedArray[Py_ssize_t]](image_buf.shape)[1].int
        C = cast[ptr UncheckedArray[Py_ssize_t]](image_buf.shape)[2].int
    doAssert C == 3 or C == 4, "Either 3 rgb channels, or 4th channel as alpha are allowed!"

    var
        new_H = cast[ptr UncheckedArray[Py_ssize_t]](resized_buf.shape)[0].int  
        new_W = cast[ptr UncheckedArray[Py_ssize_t]](resized_buf.shape)[1].int
        new_C = cast[ptr UncheckedArray[Py_ssize_t]](resized_buf.shape)[2].int
    doAssert new_C == 3 or new_C == 4, "Either 3 rgb channels, or 4th channel as alpha are allowed!"

    let 
        x_0 = cast[ptr UncheckedArray[uint8]](image_buf.buf)
        x_1 = cast[ptr UncheckedArray[uint8]](resized_buf.buf)

    var thread_state = saveThreadState()   # `getting buffer` would increment the `ref-count`, so as not to be collected by GC, even we release the GIL for other threads to progress!
    resize_naive(
        image_data = x_0,
        height = H,
        width = W,
        channels = C,

        resized_buffer = x_1,
        new_height = new_H,
        new_width = new_W,
        new_channels = new_C,
        channel_conversion_info = channel_conversion_info,
        tile_size = tile_size
    )

    # acquire GIL before any python C Api calls!
    restoreThreadState(thread_state)
    # doAssert has_gil()

    resized_buf.release()
    image_buf.release()

# proc get_image_dimensions(
#     image_raw:PyObject,  # raw image data read generally from disk (encoded i.e jpg/png/..)
#     ):tuple[flag:bool, shape:tuple[height:int, width:int, channels:int]]  {.exportpy.} = 
    
#     var image_buf:RawPyBuffer
#     image_raw.getBuffer(image_buf, PyBUF_SIMPLE or PyBUF_ND)  # readable , This also increase reference count for this buffer!
    
#     doAssert image_buf.ndim.int == 1, "Expected to be 1D array, reshape it to 1D array of (raw) bytes!"
#     let size_buffer = cast[ptr UncheckedArray[Py_ssize_t]](image_buf.shape)[0].int 
#     result = infoFromMemory(
#         cast[ptr UncheckedArray[uint8]](image_buf.buf),
#         size_buffer
#     )

#     image_buf.release() # decrease the ref-count!
#     return result
