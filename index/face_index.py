
import numpy as np
from typing import Tuple

def compare_face_embeddings(query:np.array, data_embeddings:np.array, embedding_size:int = 512) -> Tuple[np.array, np.array]:
    assert query.size == embedding_size, "Expected a single vector during query routine, use a For loop around query routine if needed."
    assert len(data_embeddings.shape) == 2 , "Expected a 2D matrix"
    assert data_embeddings.shape[1] == embedding_size

    simiilarity_scores = np.square(query.reshape((1, embedding_size)) - data_embeddings).sum(axis = -1)
    sorted_indices = np.argsort(simiilarity_scores)            # lower the score, the more similiar the faces are.
    sorted_scores = simiilarity_scores[sorted_indices]         # 
    return sorted_indices, sorted_scores