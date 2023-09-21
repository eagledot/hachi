## Usage:
## FaceEmbeddings pipeline to generate face embeddings given raw image data for all the faces detected in the raw-data/image.

from . import faceEmbeddings_python_module as pipeline
import numpy as np

def load_model(weightFile:str):
    # Initialize the pipeline and load the weights.
    # Must be called before atleast Once, before calling detect_embedding.

    pipeline.load_model(weightFile)

def detect_embedding(frame, is_bgr:bool = False, conf_threshold:float = 0.9, nms_threshold:int = 0.45, max_count:int = 50, embedding_dim:int = 512) -> int:
    """
    Generate face embeddings/features/vectors for all the faces_detected in the frame/image.

    ##Inputs:
        frame: Numpy array of shape [H,W,3] with Uint8 data-type.
        conf_threshold:float threshold to suppress predictions with confidence less than this threshold.
        nms_threshold:float threshold used by Non Maximum Suppression to suppress overlapping boxes with IOU greater than this value.
        max_count:int  maximum number of faces/embeddings that can be generated for an image.
    
    ##Returns:
        bounding_boxes:  Numpy float32 array of shape [number_faces_detected, 4] . where each row is of format (left,top,right,bottom,confidence) aka (x1,y1,x2,y2) format.
        embeddings: Numpy float32 array of shape [number_faces_detected, embedding_dim]. corresponding facial-features for all the detected faces.
    """

    bboxes = np.empty((max_count, 4), dtype = np.float32)
    embeddings = np.empty((max_count, embedding_dim), dtype = np.float32)

    assert len(frame.shape) == 3 ," Expected [H,W,C] uint8 format."
    assert frame.dtype == np.uint8, "Must be Uint8 data."

    num_faces_detected = pipeline.detect_embedding(frame, bboxes, embeddings, conf_threshold, nms_threshold, is_bgr)
    print("{} Faces detected".format(num_faces_detected))
    
    return bboxes[:num_faces_detected,:].copy(), embeddings[:num_faces_detected,:].copy()

