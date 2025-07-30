from enum import Enum
import os
import sys
import numpy as np

sys.path.append(os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "nim"))
import utils_nim

# Keep it in sync with Nim corresponding enums, comes from resize.nim!
class ChannelConversion(Enum):
    SAME = 0  
    BGR2RGB =  1
    RGB2BGR = 2
    RGB2BGRA = 3
    BGR2BGRA = 4
    BGR2RGBA =  5
    RGBA2BGRA = 6
    BGRA2RGBA =  7

class ColorFormat(Enum): # comes from encoder_hachi.nim
        RGB = 0
        BGR = 1
        RGBA = 2
        BGRA = 3

def encode_image(
    image:np.ndarray,  # containing packed image data.
    color_format:ColorFormat,  # Input color format, BGRA is best for little-endian systems, as we do away with copy into picture container!!

    quality:float = 100,
    lossless:bool = True,
    meth:int = -1
    ) -> np.ndarray :
    # NOTE: encodes an image(RGB) data into WEBP format, routine identifier should be `encode_webp` !!!
    # Return 1D array containing compressed bytes for given image !

    assert image.dtype == np.uint8
    
    # allocate enough space to hold the compressed webp data! (Cannot be larger than the RAW-DATA itself, right!)
    webp_header_size = 20 
    expected_max_size = (image.shape[0] * image.shape[1] * image.shape[2]) + webp_header_size
    encoded_buffer = np.empty(shape = (expected_max_size,), dtype = np.uint8)

    size = utils_nim.encode_image(
        image,
        encoded_buffer, # isolated copy, as created in this routine!
        color_format = color_format.value,

        quality = quality,
        lossless = lossless,
        meth = meth
    )
    return encoded_buffer[:size]

def resize(image:np.ndarray, # [H,W,C] format!
    new_height:int,
    new_width:int,
    channel_conversion_info = ChannelConversion.SAME,
    tile_size:int = 1,
    aligned_32b:bool = True # for following webp encoding.. 
    )-> np.ndarray:

    new_channels = image.shape[2]
    if channel_conversion_info == ChannelConversion.SAME:
        pass
    elif channel_conversion_info == ChannelConversion.RGB2BGR or (channel_conversion_info == ChannelConversion.BGR2RGB):
        new_channels = 3
    else:
        new_channels = 4
    
    assert image.dtype == np.uint8
    
    webp_align_offset = 32
    required_size = (new_height * new_width * new_channels )
    resized_buffer = np.empty((required_size  + webp_align_offset ), dtype = np.uint8)
    pad_bytes = 0

    if aligned_32b:
        base = (resized_buffer.__array_interface__['data'][0])
        pad_bytes = (webp_align_offset * ((base - 1) // webp_align_offset + 1) - base)
        assert pad_bytes <= webp_align_offset - 1
    resized_image = resized_buffer[pad_bytes:(pad_bytes + required_size)].reshape((new_height, new_width, new_channels))

    utils_nim.resize(
        image,
        resized_image,  # isolated memory , i.e. created in this routine just now! so safe to call this routine from any (truly)parallel threads !
        channel_conversion_info.value,
        tile_size = tile_size
    )

    return resized_image


if __name__ == "__main__":
    
    import cv2
    import matplotlib.pyplot as plt

    image_path = "C://users/random/pictures/netflix.png"
    image = cv2.imread(image_path)
    assert not (image is None)

    height, width, channels = image.shape
    ratio = height / width
    preview_max_width = 640

    tile_size  = 8 
    # new_width = min(width, preview_max_width)
    new_width = preview_max_width   # to be divisible by tile_size mostly!
    new_height = int(ratio * new_width)
    new_height = new_height + (tile_size - (new_height % tile_size))  # For now tiling tail logic has not been written, so we make it divisible in the first place!
    new_height = 360

    resized_image = resize(
        image,
        new_height = new_height,
        new_width = new_width,
        channel_conversion_info = ChannelConversion.BGR2BGRA,
        tile_size = tile_size
    )
    # plt.imshow(resized_image)
    # plt.show() 
    print(resized_image.shape)

    encoded_data = encode_image(
        image = resized_image,
        color_format=ColorFormat.BGRA,
        quality=90,
        lossless=False,
        meth = 2
    )
    with open("./test.webp", "wb") as f:
        f.write(encoded_data)
    
    def test_extension():
        for i in range(200):
            print(i)
            resized_image = resize(
            image,
            new_height = new_height,
            new_width = new_width,
            channel_conversion_info = ChannelConversion.BGR2BGRA,
            tile_size = tile_size
            )

            encoded_data = encode_image(
                image = resized_image,
                color_format=ColorFormat.BGRA,
                quality=90,
                lossless=False,
                meth = 2
            )
            time.sleep(0.1)
        print("xxxxxxxxxxxxxxxx")

    import threading 
    import time
    t = threading.Thread(target = test_extension, args = ())

    imread_buffer =  np.empty(shape = (12000 * 12000 * 4), dtype = np.uint8)
    print("starting thread..")
    t.start()

    while True:
        print("yyyyyyyyyyyyyy")
        (flag, (h,w,c)) = utils_nim.imread(image_path, imread_buffer, leave_alpha = True) # RGB , no alpha
        print("{} x {} x {}".format(h,w,c))
        time.sleep(0.1)
    # print("thread done..")