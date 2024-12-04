################################
#    Hog features calculation
#    Copyright: Anubhav N. (eagledot)
#    License: BSD-3-Clause or AGPL 3.0
#    Credits:
#       https://github.com/scikit-image/scikit-image/blob/main/skimage/feature/_hog.py
#################################

# Supposed to create all the code to generate an hog-image for eyes collected from an aligned face.
# for now opencv is a dependency (For sobel filter) except numpy.
# NOTE: can be easily speed up by writing in lower-language like C/nim. (For now good enough until all testing is done.!)

import numpy as np
import cv2

from typing import Optional, Tuple

def hog_channel_gradient(channel):
    # Taken from scikit-image, not being used for now.. may be later when replacing sobel from open-cv.
    """Compute unnormalized gradient image along `row` and `col` axes.

    Parameters
    ----------
    channel : (M, N) ndarray
        Grayscale image or one of image channel.

    Returns
    -------
    g_row, g_col : channel gradient along `row` and `col` axes correspondingly.
    """
    g_row = np.empty(channel.shape, dtype=channel.dtype)
    g_row[0, :] = 0
    g_row[-1, :] = 0
    g_row[1:-1, :] = channel[2:, :] - channel[:-2, :]
    g_col = np.empty(channel.shape, dtype=channel.dtype)
    g_col[:, 0] = 0
    g_col[:, -1] = 0
    g_col[:, 1:-1] = channel[:, 2:] - channel[:, :-2]

    return g_row, g_col

def get_magnitude_angles(image:np.ndarray)->Tuple[np.ndarray, np.ndarray]:
    assert image.dtype == np.uint8, "For now it is assumed..."

    # generally a single matrix is used, (for y it can be transposed)
    gx = cv2.Sobel(image, cv2.CV_32F, 1, 0, ksize=1)
    gy = cv2.Sobel(image, cv2.CV_32F, 0, 1, ksize=1)

    # calculate magnitudes -> np.sqrt(np.square(gx) + np.square(gy))
    # calculate angles -> math.degrees(math.arctan(gy / (gx + 1e-7)))

    # using opencv in one go..
    mag, angle = cv2.cartToPolar(gx, gy, angleInDegrees = True)
    return mag, angle

# @profile
def create_histogram_region(magnitudes:np.ndarray, angles:np.ndarray, n_bins = 9):
    """
    Being provided magnitudes and angles for a region of an image. we create histogram of gradients in selected patch.
    After deciding weightage for a lower and higher bin (based on the distance), we accumulate magnitudes in bins.
    So each bin would be representing the cumulative (gradient) magnitudes for pixels having a particular orientation. (Say 20degress - 40 degrees)
    
    Returns an nd.array of 1D, with shape = (n_bins,)
    
    This is then(generally) used to create histograms for all possible cells for image-patch we would be calculating a hog-image-descriptor.
    Later generally followed by normalization of overlapped cells to be invariant to lightning and some minor noise in a part of image!
    """
    assert magnitudes.shape == angles.shape
    assert len(magnitudes.shape) == 2, "expected a 2D matrix.. expand dimension if needed"
    assert 180 % n_bins == 0, "expected to be fully divisible.. remove this if know what you are doing"
    
    H,W = magnitudes.shape
    bin_size = 180 // n_bins
    
    histogram = np.zeros((n_bins), dtype = np.float32)
    for i in range(H):
        for j in range(W):
            angle_value = angles[i,j]
#             assert angle_value <= 180 and angle_value >= 0, "Expected each angle to be [0-180] range"
            if angle_value >= 180:
                angle_value = angle_value - 180
            
            # get the weightage, (inversely) proportional to distance from nearest bins.
            # bin_l, remainder = np.divmod(angle_value, bin_size)
            bin_l = angle_value // bin_size
            remainder = angle_value % bin_size

            weight_r = remainder / bin_size
            weight_l = 1 - weight_r

            magnitude_value = magnitudes[i,j]
            value_r = magnitude_value * weight_r
            value_l = magnitude_value * weight_l

            bin_l = int(bin_l)
            assert bin_l <= n_bins
            bin_r = (bin_l + 1) % n_bins

            histogram[bin_l] += value_l
            histogram[bin_r] += value_r
    
    return histogram

# @profile
def get_orientation_histograms(image, 
            pixels_per_cell :Tuple[int, int],  # in (height, width) format.
            orientations : int = 9
        ):
    """
    GIVEN an image, and pixels per_cell argument, we create an orientation histogram for each cell.
    Hence returns an array shaped: [H // pixels_per_cell[0], W // pixels_per_cell[1], orientations]

    Further user can choose to normalize value in adjacent cells (BLOCKS!) as the next stage in process of getting hog-image-descriptor !
    """
    assert len(image.shape) >= 2
    n_channels = 1
    H,W = image.shape[:2]
    if len(image.shape) > 2:
        n_channels = image.shape[2]

    mags,angles = get_magnitude_angles(image)
    if n_channels > 1:
        indices_max = np.argmax(mags, axis = -1)
        mags = np.max(mags, axis = -1) # keep the one having maximum magnitude.

        # for angles keep the one having maximum magnitude
        angles_temp = np.zeros_like(mags)
        for i in range(H):
            for j in range(W):
                angles_temp[i,j] = angles[i,j,indices_max[i,j]]
        angles = angles_temp
        del angles_temp, indices_max

    assert len(angles.shape) == 2
    assert len(mags.shape) == 2

    n_pixels_row = pixels_per_cell[0]
    n_pixels_col = pixels_per_cell[1]
    assert H % n_pixels_row == 0
    assert W % n_pixels_col == 0
    n_cells_row = H // n_pixels_row
    n_cells_col = W // n_pixels_col

    result = np.zeros((n_cells_row, n_cells_col, orientations), dtype = np.float32)
    for i in range(n_cells_row):
        for j in range(n_cells_col):
            i_start = i*n_pixels_row
            i_end = (i+1)*n_pixels_row

            j_start = j*n_pixels_col
            j_end = (j+1)*n_pixels_col

            cell_mags = mags[i_start:i_end, j_start:j_end]
            cell_angles = angles[i_start:i_end, j_start:j_end]

            hist = create_histogram_region(
                magnitudes = cell_mags,
                angles = cell_angles,
                n_bins = orientations
            )
            assert len(hist) == orientations
            result[i,j,:] = hist[:] / (n_pixels_col * n_pixels_row)

    return result

def draw_line(r1,c1, r2,c2) -> tuple[np.ndarray,  np.ndarray]:
    # Function to draw a line using Bresenham's algorithm. 
    # (basically the numbers of pixels in x direction for a given y inversely proportional to slope.) 
    # replacing the skimage.draw.line() function being used to draw the hog_image.
    # NOTE: fast enough for our use case (part of indexing, not inference).. (otherwise would be speed up if bottleneck portion.)

    """
    img = np.zeros((10,10))
    rr,cc = draw_line(1,1, 5,5)
    img[rr, cc] = 1.0  # directly index!
    plt.imshow(img)
    """

    y1,x1 = r1,c1
    y2,x2 = r2,c2
    rr = []
    cc = []
    
    dx = abs(c2 - c1)
    dy = abs(r2 - r1)
    
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    err = dx - dy
    
    y1,x1 = r1,c1
    while True:
        rr.append(y1)
        cc.append(x1)
        
        if x1 == x2 and y1 == y2:
            break
            
        err2 = err * 2
        if err2 > -dy:
            err -= dy
            x1 += sx
        if err2 < dx:
            err += dx
            y1 += sy

    return np.array(rr).astype(np.int32), np.array(cc).astype(np.int32)

# @profile
def get_hog_image(
        image:np.ndarray,
        pixels_per_cell :Tuple[int, int],  # in (height, width) format.
        orientations : int = 9
        ):
    # NOTE: we don't normalize using blocks. we just get the histogram orientations for each cell
    # and then create a hog-image.
    # We are supposed to have an aligned image-patch/eyes. (for which we compare directly with a or more reference image and filter using threshold)
    # it Works good enough for our case!

    s_row, s_col = image.shape[:2]
    c_row, c_col = pixels_per_cell
    n_cells_row = int(s_row // c_row)  # number of cells along row-axis
    n_cells_col = int(s_col // c_col)  # number of cells along col-axis
    
    orientation_histograms = get_orientation_histograms(
        image = image,
        pixels_per_cell = pixels_per_cell,
        orientations = orientations)

    # NOTE: taken from skimage.feature.hog.py . (except with our draw_line equivalent to draw.line)
    c_row, c_col = pixels_per_cell
    radius = min(c_row, c_col) // 2 - 1
    orientations_arr = np.arange(orientations)
    # set dr_arr, dc_arr to correspond to midpoints of orientation bins
    orientation_bin_midpoints = np.pi * (orientations_arr + 0.5) / orientations
    dr_arr = radius * np.sin(orientation_bin_midpoints)
    dc_arr = radius * np.cos(orientation_bin_midpoints)
    hog_image = np.zeros((s_row, s_col), dtype= np.float32)
    for r in range(n_cells_row):
        for c in range(n_cells_col):
            for o, dr, dc in zip(orientations_arr, dr_arr, dc_arr):
                centre = tuple([r * c_row + c_row // 2, c * c_col + c_col // 2])
                # rr, cc = draw.line(
                rr, cc = draw_line(
                    int(centre[0] - dc),
                    int(centre[1] + dr),
                    int(centre[0] + dc),
                    int(centre[1] - dr),
                )                
                hog_image[rr, cc] += orientation_histograms[r, c, o]
    
    return hog_image


if __name__ == "__main__":
    # kernprof -l -v <hog.py> # put @profile on the routine.
    # img = np.random.randint(0, 255, size = (12, 48)).astype(np.uint8)
    # _ = get_hog_image(img, pixels_per_cell = (4,4), orientations = 9)
    pass