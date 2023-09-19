# Image index/db to store and serve image embeddings.

# config
SHARD_PREFIX = "IMAGE_SHARD"
IMAGE_INDEX_DIRECTORY = "./image_indices"
IMAGE_EMBEDDING_SIZE = 512
IMAGE_MATCHING_MIN_SCORE = 0   # minimum score to consider two embeddings a match, increment it for lower false positives.
IMAGE_SHARD_SIZE = 40

from typing import Optional

import numpy as np

from sharding import CommonIndex