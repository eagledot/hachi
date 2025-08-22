# For now Matches the `meta-data` resource hashes with `image-index` data!

# HOW TO run:
# 1. `cd` to this directory.
# 2. run `python sanity_check.py`

import json,os,pickle

META_INDEX_PATH = "./meta_indices"
PREFIX = "metaIndexV2"

IMAGE_INDEX_PATH = "./image_indices"

with open(os.path.join(IMAGE_INDEX_PATH, "IMAGE_SHARD_INDEX.pkl"), "rb") as f:
    rowIdx_2_hash = pickle.load(f)
    hash_image = rowIdx_2_hash.values() # dict_values type!

with open(os.path.join(META_INDEX_PATH, "{}_resource_hash.json".format(PREFIX)), "rb") as f:
    (column_type, hashes_string_raw) = json.load(f)
    assert column_type == "colString", print(column_type)
    hash_meta = json.loads(hashes_string_raw)
    del hashes_string_raw

# TEST
assert len(hash_meta) == len(hash_image), "MUST MATCH, hashes are supposed to be unique keys\nEach hash corresponds to an image indexed. Image-index stores the embeddings, meta-index stores the meta-data for that image.\nmay not be case for face-embeddings, where an image could have multiple (facial)embeddings!"
for i,x in enumerate(hash_meta):
    assert x in hash_image, "Cannot find: {} in image-index, indicating indices corruption, if indexing completed successfully , there is a  nasty bug somewhere !!".format(x)


os.system("color")
RED = '\033[31m'
GREEN = '\033[32m'
RESET = '\033[0m'
print(GREEN + "xxxxxxxxxx")
print("Sanity checks passed!")
print(GREEN + "xxxxxxxxxxxxx")
print(RESET)
