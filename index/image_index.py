# Image index/db to store and serve image embeddings.

import os

# config
SHARD_PREFIX = "IMAGE_SHARD"
IMAGE_INDEX_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./image_indices")
IMAGE_EMBEDDING_SIZE = 512
IMAGE_MATCHING_MIN_SCORE = 0   # minimum score to consider two embeddings a match, increment it for lower false positives.
IMAGE_SHARD_SIZE = 40

from typing import Optional, Tuple, List

import numpy as np

from sharding import CommonIndex

class ImageIndex(CommonIndex):
    def __init__(self, shard_size = IMAGE_SHARD_SIZE, embedding_size = IMAGE_EMBEDDING_SIZE, index_directory= IMAGE_INDEX_DIRECTORY, shard_prefix = SHARD_PREFIX, preload:bool = True) -> None:
        super().__init__(
            shard_prefix=shard_prefix,
            index_directory=index_directory,
            embedding_size=embedding_size,
            shard_size=shard_size,
            preload = preload
        )
    
    def compare(self, query:np.array, data_embeddings:np.array) -> Tuple[np.array, np.array]:
        # return the sorted indices, and corresponding scores.

        assert query.size == self.embedding_size, "Expected a single vector during query routine, use a For loop around query routine if needed."
        assert len(data_embeddings.shape) == 2 , "Expected a 2D matrix"
        assert data_embeddings.shape[1] == self.embedding_size

        similarity_scores = np.matmul(data_embeddings, query.reshape((1, self.embedding_size)).transpose()) # [N,1]            
        similarity_scores = similarity_scores.squeeze(1)
        sorted_indices =  np.argsort(similarity_scores, axis = 0)[::-1]
        sorted_scores = similarity_scores[sorted_indices]
        return sorted_indices, sorted_scores
    
    def update(self, data_hash:str, data_embedding:np.array):
        with self.lock:
            self.update_base(data_hash, data_embedding = data_embedding)
    
    def query(self, query:np.array, client_key:str, key:Optional[List[str]] = None) -> Tuple[bool, dict[str, List[float]]]:
        with self.lock:
            flag, hash_2_scores = self.query_base(query, client_key=client_key, key = key)
            return flag, hash_2_scores