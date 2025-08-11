import math
from typing import Optional, Tuple, Iterable

import numpy as np

def compare_face_embedding(e1:np.ndarray, e2:np.ndarray, embedding_size:int = 512) -> float:
    assert e1.size == embedding_size
    score = np.square(e1 - e2).sum().item()
    return score

def compare_hog_image(image_1, image_2):
    # Compares 2 hog images (generated based on the hog-histograms). 
    # same shape as the original image.
    # we use these to compare b/w two different images, rather than using hog-features as a single vector!
    
    assert image_1.shape == image_2.shape
    h,w = image_1.shape
    assert w%3 == 0
    
    
    temp_w = w // 3
    hog_11 = image_1[:h, :temp_w].ravel()
    hog_12 = image_1[:h, temp_w: 2*temp_w].ravel()
    hog_13 = image_1[:h, temp_w*2: temp_w*3].ravel()
    
    hog_21 = image_2[:h, :temp_w].ravel()
    hog_22 = image_2[:h, temp_w:  2*temp_w].ravel()
    hog_23 = image_2[:h, temp_w*2: 3*temp_w].ravel()
        

    # NOTE: tried different metrics like cosine-similarity, but following worked best ! 
    dist_1 =  np.linalg.norm((hog_11 / (1e-7 + np.linalg.norm(hog_11))) - (hog_21 / (1e-7 + np.linalg.norm(hog_21))) )
    dist_2 =  np.linalg.norm((hog_12 / (1e-7 + np.linalg.norm(hog_12))) - (hog_22 / (1e-7 + np.linalg.norm(hog_22))) )
    dist_3 =  np.linalg.norm((hog_13 / (1e-7 + np.linalg.norm(hog_13))) - (hog_23 / (1e-7 + np.linalg.norm(hog_23))) )
    
    return [dist_1, dist_2, dist_3]

def get_new_matrix_try(matrix):
    assert matrix.shape == (3,2)
    # in format [[m1, n1], [m2,n2], [m3,n3]]
    
    m1,n1 = matrix[0,0], matrix[0,1]
    m2,n2 = matrix[1,0], matrix[1,1]
    m3,n3 = matrix[2,0], matrix[2,1]
    
    # new matrix [x1,y1], [x2,y2] ..
    temp = (m1*n2) - (n1*m2) + 1e-7
    a = (n3*m2 - n2*m3) / temp
    b = (m3*n1 - n3*m1) / temp
    
    x1 = n2 / temp
    y1 = -n1 / temp
    
    x2 = -m2/temp
    y2 = m1 /temp
    
    x3 = a
    y3 = b
    
    new_matrix = np.empty((3,2), dtype = np.float32)
    new_matrix[0,:] = [x1,y1]
    new_matrix[1,:] = [x2,y2]
    new_matrix[2,:] = [x3,y3]
    return new_matrix
    

def check_slopes(landmarks) -> bool:
    # given landmarks we should be able to return slopes for both eyes..
    # then we can decide..if we would want to keep it..
    # since aligned face is much stable..
    # we get rational values for such slopes in most cases..
    
    assert landmarks.size == 10
    landmarks = landmarks.reshape(5,2)
    nose = landmarks[2]
    eye_1 = landmarks[0]
    eye_2 = landmarks[1]
    
    slope_1 = (eye_1[1] - nose[1]) / (eye_1[0] - nose[0] + 1e-6)
    slope_2 = (eye_2[1] - nose[1]) / (eye_2[0] - nose[0] + 1e-6)
    
    another_check = (slope_1 * slope_2) < 0  # must be in different horizontal quadrants too !
    if another_check:
        # or directly compare in radians..
        slope_1  = math.degrees(math.atan(abs(slope_1)))
        slope_2 = math.degrees(math.atan(abs(slope_2)))

        # apply somethreshold (degrees)
        threshold_min = 34             # 34 degree
        threshold_max = 70             # 70 degree

        flag_1 = slope_1 >= threshold_min and slope_1 <= threshold_max    
        flag_2 = slope_2 >= threshold_min and slope_2 <= threshold_max
        
        return flag_1 and flag_2
    else:
        return False

def collect_aligned_faces(frame, matrix, scale:float = 1.0, face_size = (112, 112)):
    # frame original uint8 image.
    # matrix: [3,2] matrix learned, during alignment procedure.
    # landmarks: [5,2] 
    # face_size: REFERENCE face size. (for which we have reference landmarks.)
    # scale: (i think about if some scaling involved while extracting bboxe/face.. for now 1.0)
    
    H, W, C = frame.shape
    assert face_size == (112, 112)
    assert scale == 1.0, "it is expected to 1, have to read the code again to understand it.."
    new_frame = np.zeros((112, 112, 3)).astype(np.uint8)
    
    # for each pixel in the frame we intend to get the
    # may be this can be reused.. as as inputs would BE CONSTANT..
    xx, yy = np.meshgrid(np.linspace(0, 112 - 1, num = 112), np.linspace(0, 112-1 , num = 112))
    xx = xx.reshape(-1,1)
    yy = yy.reshape(-1,1)
    matrix[:2, :2] *= scale
    
    # intial coordinates shape [N,3]
    # this could be reused too.. as another constant/non-variant added!
    coords = np.concatenate([xx, yy, np.ones((xx.size, 1))], axis = 1).astype(np.int32)
    final_coords = np.dot(coords, matrix)  # [N, 2]
    xx_final, yy_final = final_coords[:,0], final_coords[:,1]
    
    # clamp (for edge cases ! (to check original codebase.. of collecting aligned faces also))
    xx_final = np.clip(xx_final, 0, W-1)
    yy_final = np.clip(yy_final, 0, H-1)
    xx_final = xx_final.astype(np.int32)
    yy_final = yy_final.astype(np.int32)
    
    xx = xx.astype(np.int32)
    yy = yy.astype(np.int32)
    
    
    new_frame[yy.ravel(), xx.ravel(), :] = frame[yy_final, xx_final, :]
    
    return new_frame


def collect_eyes(face, matrix, landmarks, patch_width = 12, patch_height = 10):
    # collect eyes patches along with a signal if face is rotated to left or right.. to make sure eye patch have expected information.
    # patch_width/height for a (112, 112) aligned face.
    
    # returns:
    # flag: bool, to signal if face is stable/not-rotated to get good eye-patches.
    # eyes: extracted patch of eyes, to visualize even if flag is False.
    # new_landmarks: landmarks transformed to be displayed on the aligned-face (on 112 x 112).


    assert landmarks.size == 10
    assert matrix.shape == (3,2)
    assert face.shape == (112, 112, 3)
    assert face.dtype == np.uint8
    landmarks = landmarks.reshape(5,2)
    
    # convert to gray-scale.
    # temp = cv2.cvtColor(new_frame, cv2.COLOR_RGB2GRAY)
    temp = face[:,:,:3].astype(np.float32) * np.array(([0.299, 0.587, 0.114])).astype(np.float32) 
    gray = np.sum(temp, axis = -1).astype(np.uint8)
    
    # create/collect inverse matrix to transform original coordinates/landmarks to face space.
    new_matrix = get_new_matrix_try(matrix)
    
    # use this matrix to get new landmarks
    new_landmarks = np.dot(np.concatenate([landmarks, np.ones((5,1))], axis = 1), new_matrix) # [5,2]
    new_landmarks = new_landmarks.astype(np.int32)
    
    # signal about rotation of face.. to decide which eye patch/patches is best suited for further processing on eyes
    flag = check_slopes(new_landmarks)
    
    # collect eyes patches.
    # left eye
    top = new_landmarks[0,1] + patch_height
    left = new_landmarks[0,0] - patch_width
    bottom = new_landmarks[0,1] - patch_height
    right = new_landmarks[0,0] + patch_width

    # right eye
    top_r = new_landmarks[1,1] + patch_height
    left_r = new_landmarks[1,0] - patch_width
    bottom_r = new_landmarks[1,1] - patch_height
    right_r = new_landmarks[1,0] + patch_width

    left_patch = gray[bottom:bottom + 2*patch_height, left:left + 2*patch_width]
    right_patch = gray[bottom_r:bottom_r + 2*patch_height, left_r:left_r + 2*patch_width]
    
    if (left_patch.shape[0] != 2*patch_height or right_patch.shape[0] != 2*patch_height or left_patch.shape[1] != 2*patch_width or right_patch.shape[1] != 2*patch_width):
        # Should be very rare!!
        flag = False
        eyes = None
        print("[WARNING]: Not being able to generate eyes patches of expected size!")
    else:
        eyes = np.concatenate([left_patch, right_patch], axis = 1)
    
    return (flag, eyes, new_landmarks)
