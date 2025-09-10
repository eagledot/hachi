type
    ChannelConversion* = enum
        SAME    # 0
        BGR2RGB # 1
        RGB2BGR # 2
        RGB2BGRA # 3
        BGR2BGRA # 4
        BGR2RGBA # 5
        RGBA2BGRA # 6
        BGRA2RGBA # 7

proc resize_naive*(
    image_data: ptr UncheckedArray[uint8], # (readable) packed image_data!
    height,width,channels:Natural,

    resized_buffer: ptr UncheckedArray[uint8], # (packed) (writable) to put the resized data into!
    new_height,new_width,new_channels:Natural,
    
    channel_conversion_info:ChannelConversion = SAME,
    tile_size:Natural = 8,     # make it a multiple of 4, later may be SIMD opportunites!
    )=
    # expects a 3D image matrix in format: [H,W,C] (C)contiguous data. 
    # (i.e C with stride as 1 is expected!)
    
    # input channels:
    doAssert channels == 3 or channels == 4  # input channels.

    var tile_size = tile_size
    if (new_height mod tile_size != 0) or (new_width mod tile_size != 0):
        echo "TODO: Write the tail logic for tiling code..."
        tile_size = 1
    
    let
        stride_h = width * channels
        stride_w = channels
    const stride_c = 1

    # Create appropriate order array based on the conversion Requested!
    var new_channel_order:array[4,int32]
    var induce_alpha = false
    if channel_conversion_info == SAME:
        doAssert new_channels == channels
        if channels == 4:
            new_channel_order = [0,1,2,3]
        else:
            new_channel_order = [0,1,2,-1]
    elif channel_conversion_info == RGBA2BGRA:
        doAssert new_channels == channels
        doAssert new_channels == 4
        new_channel_order = [2,1,0,3]
    elif channel_conversion_info == BGRA2RGBA:
        doAssert new_channels == channels
        doAssert new_channels == 4
        new_channel_order = [2,1,0,3]
    elif channel_conversion_info == RGB2BGR:
        assert channels == 3
        new_channel_order = [2,1,0,-1]
        doAssert new_channels == 3
    elif channel_conversion_info == BGR2RGB:
        assert channels == 3
        new_channel_order = [2,1,0,-1]
        doAssert new_channels == 3
    elif channel_conversion_info == RGB2BGRA:
        assert channels == 3
        new_channel_order = [2,1,0,-1]
        induce_alpha = true
        doAssert new_channels == 4
    elif channel_conversion_info == BGR2BGRA:
        assert channels == 3
        new_channel_order = [0,1,2,-1]
        induce_alpha = true
        doAssert new_channels == 4
    elif channel_conversion_info == BGR2RGBA:
        assert channels == 3
        new_channel_order = [2,1,0,-1]
        induce_alpha = true
        doAssert new_channels == 4
    else:
        doAssert 3 == 4, "not covered: " & $channel_conversion_info
    
    assert new_height > 0
    assert new_width > 0

    # resize code/algorithm!
    let r_w = (width.float32 / new_width.float32)
    let r_h = (height.float32 / new_height.float32)

    let
        stride_new_h = (new_width * new_channels)
        stride_new_w = (new_channels)
    
    for h_t in 0..<(new_height div tile_size):
        let offset_h = h_t * tile_size
        for w_t in 0..<(new_width div tile_size):
            let offset_w = w_t * tile_size

            # resize a (Tile x Tile) portion .
            for h in 0..<tile_size:
                let ih = (r_h * (h + offset_h).float32) # converting to int already acts as floor!
                for w in 0..<tile_size:
                    let iw = (r_w * (w + offset_w).float32) # converting to int already acts as floor!
                    
                    let
                        new_h_t = (h + offset_h)
                        new_w_t = (w + offset_w)
                    
                    # assert new_h_t >= 0 and new_h_t < (new_height), "got: " & $new_h_t.int & " for H: " & $new_height
                    # assert new_w_t >= 0 and new_w_t < (new_width), "got: " & $new_w_t.int & " for W: " & $new_width
                    # assert ih.int >= 0 and ih.int < (height), "got: " & $ih.int & " for H: " & $height
                    # assert iw.int >= 0 and iw.int < (width), "got: " & $iw.int & " for W: " & $width

                    # If nearest-neighbour mode!
                    # for k in 0..<channels:
                    #     let offset = (ih.int)*stride_h + (iw.int)*stride_w + k
                    #     let pixel = image_data[offset]
                    #     resized_buffer[(new_h_t)*(stride_new_h) + (new_w_t)*(stride_new_w) + new_channel_order[k]*1] = pixel
                        
                    # if bi-linear mode!
                    let
                        th = int(ih).float32     # floor
                        tw = int(iw).float32      # floor
                    let
                        d_00 = (ih - th) + (iw - tw)
                        d_01 = (ih - th) + (tw + 1 - iw)
                        d_10  = (th + 1 - ih) + (iw - tw)
                        d_11 = (th + 1 - ih) + (tw + 1 - iw)
                    
                    # calculate weightage for each of 4 pixels
                    let
                        w_00 = 1 - (d_00 / 2) # dividing by 2 to make sure under 1.
                        w_01 = 1 - (d_01 / 2)
                        w_10 = 1 - (d_10 / 2)
                        w_11 = 1 - (d_11 / 2)
                    let w_s = w_00 + w_01 + w_10 + w_11

                    let
                        th_i = int(th)
                        tw_i = int(tw)

                    for k in 0..<channels:
                        let
                            p_00 = w00/w_s * image_data[(th_i)*stride_h + (tw_i)*(stride_w) + k*stride_c].float
                            p_01 = w01/w_s * image_data[(th_i)*stride_h + min(width - 1, (tw_i + 1))*(stride_w) + k*stride_c].float
                            p_10 = w10/w_s * image_data[min(height - 1, th_i + 1)*stride_h + (tw_i)*(stride_w) + k*stride_c].float
                            p_11 = w11/w_s * image_data[min(height - 1, th_i + 1)*stride_h + min(width - 1, tw_i + 1)*(stride_w) + k*stride_c].float
                        resized_buffer[(h + offset_h)*(new_width * new_channels) + (w + offset_w)*(new_channels) + new_channel_order[k]*1] = uint8(p_00 + p_01 + p_10 + p11)
                    
                    if induce_alpha: # only if channels were 3 (this could be taken)
                        # NOTE: `alpha` inducing is allowed for only last channel!
                        resized_buffer[(h + offset_h)*(new_width * new_channels) + (w + offset_w)*(new_channels) + 3*1] = 255'u8
                