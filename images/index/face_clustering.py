#########################################################
#        Face Clustering Code for Hachi
#        Copyright 2024. Anubhav N.(eagledot)
#        License    AGPL 3.0
############################################################


from typing import Tuple, Optional, Union
from collections import namedtuple
import base64
import os
import uuid
import json

from .face_utils import collect_aligned_faces, collect_eyes, compare_hog_image, compare_face_embedding
from .hog import get_hog_image

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml"))
import faceEmbeddings_python_module as pipeline
weights_path = os.path.join(os.path.dirname(__file__),"..", "data", "pipelineRetinafaceV2.bin")
pipeline.load_model(weightFile = weights_path, from_stream=True)

import numpy as np
import cv2


# Directory to save index.
FACECLUSTERS_INDEX_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "./face_indices")
FACECLUSTERS_INDEX_FILE = "face_clusters.json"
############################################################################
# Necessary data-structures 
###################
Cluster = namedtuple("Cluster", field_names = 
                     ["resource_hashes",   
                      "master_embeddings",
                      "id",               
                      "label",         # not good idea is to store label.. here.. if we have already using a meta-index. another trip to here..  
                      "preview_data"]    
                    )

def cluster_to_json(c:Cluster) -> dict:
    result = dict()
    for field in c._fields:
        if field == "master_embeddings":
            # save in hex-encoding to read it faster, directly using numpy!
            result[field] = (np.array(c.master_embeddings, dtype = np.float32).ravel().tobytes()).hex()
        else:
            data = getattr(c, field)
            if isinstance(data, set):
                data = list(data)
            result[field] = data
    result["master_embeddings_count"] = len(c.master_embeddings)
    return result

# auxilary temporary data needed for finalizing cluster.
# Assumption: for a session hyperparameters are assumed to be invariant
Auxclusterdata = namedtuple("Auxclusterdata",field_names = [
    "absolute_path", 
    "face_index",
    "face_preview",    
    "feasibility",     
    "resource_hash"
])

################# Necessary routines ###################
def can_merge_embedding(e1, e2, threshold:float = 1.12) -> bool:
    score = compare_face_embedding(e1, e2)
    if score <= threshold:  # can be lenient in case comparing with non-master embedding.
        return True
    else:
        False

def can_merge(c1:Cluster, c2:Cluster) -> bool:
    """
    Code to decide if we could merge 2 clusters.
    generally a new one into existing one.
    """
    if c1.id == c2.id:
        # For now this is supposed to be a case of collecting resources/embeddings. we couldn't categorize!        
        assert len(c1.master_embeddings) == 0
        assert len(c1.master_embeddings) == len(c2.master_embeddings)
        return True
    
    if len(c1.master_embeddings) == 0 or len(c2.master_embeddings) == 0:
        return False

    # based on the master embeddings.
    m_embeddings_1 = c1.master_embeddings
    m_embeddings_2 = c2.master_embeddings
    
    if len(m_embeddings_1) == 1 or len(m_embeddings_2) == 1:
        # not a good idea to merge 2 clusters where one of those has only a single master embedding!
        return False
    
    # brute-force matching..
    temp_scores = []
    for m_1 in m_embeddings_1:
        for m_2 in m_embeddings_2:
            score = compare_face_embedding(m_1, m_2)
            temp_scores.append(score)
        
    # this is rigid to prevent un-expected merging... but only after real world cases we would update logic
    if max(temp_scores) <= 1.0:
        # meaning high confidence, that these two clusters can be matched.
        return True
    else:
        return False

class FaceIndex(object):
    """
    Main class to encapsulate update information and finalizing face clusters on save.
    
    NOTE: not expecting to run it again on already indexed resource-hashes/resources, as statistical information would change!
    It is on user to make sure corresponding meta-attribute(cluster-id) is updated correctly for meta-index.
    If run again for an already indexed resource, we may get a new cluster for no-info resource, but if update in meta-index is working correctly we still should get reasonable results without any error ?
    """
    
    def __init__(self, embedding_size:int, max_embeddings_count:int = 4_000, max_master_embeddings_count:int = 3, debug:bool = False, index_directory:str = FACECLUSTERS_INDEX_DIRECTORY):

        # hyperparameters. (shouldn't effect any existing or newer index, even if changed!)
        self.max_embeddings_count = max_embeddings_count
        self.confidence = 0.9
        self.hog_threshold = 0.73
        self.max_threshold_possible = 1.25  # if score > this, then no-category , its helps later on during (face-bbox -> cluster_id) mapping.
        self.max_master_embeddings_count = max_master_embeddings_count
        self.embedding_size = embedding_size

        # Paths
        self.index_directory = index_directory
        self.index_absolute_path = os.path.join(self.index_directory, FACECLUSTERS_INDEX_FILE)
        self.reference_data_path = os.path.join(os.path.dirname(__file__), "..", "data")
        
        
        # specical ids
        self.no_info_id = "no-categorical-info"
        self.no_face_detected_id = "no-face-detected" # not used for now.
        
        # an append only collection of clusters. ..can use any iterable container!
        self.id_to_cluster = dict()  # quickly get corresponding clusters given its id.. generally id is stored in meta-index
        
        # temporary data that must be reset after finalization.
        self.aux_data:list[Auxclusterdata] = []
        self.embeddings_storage = np.empty((max_embeddings_count, embedding_size), dtype = np.float32)
        self.embeddings_count = 0
        
        # NOTE: eyes on disk are supposed to be shape (12, 48), collected from aligned face (112, 112) gray image.
        reference_eyes_paths = [
                os.path.join(self.reference_data_path,"reference_eyes_alia.txt"), 
                os.path.join(self.reference_data_path, "reference_eyes_kk.txt")
                ]

        self.reference_hog_images = []
        for path in reference_eyes_paths:
            eyes_data = open(path, "r").read().strip(",").split(",")
            temp_reference_arr = np.array(eyes_data).astype(np.uint8).reshape(12, 48)
            self.reference_hog_images.append(get_hog_image(temp_reference_arr, pixels_per_cell=(4,4)))
            del path, temp_reference_arr, eyes_data
        
        self.debug = debug
        if self.debug:
            self.hash_2_path = {} # to display all the referred image/resources for a cluster hashes.
        
        # load an already existing index.
        if not os.path.exists(self.index_directory):
            os.mkdir(self.index_directory)
        if os.path.exists(self.index_absolute_path):
            self.load()
            print("Loaded Face Index at: {}".format(self.index_absolute_path))
        
    def update(self, frame:np.ndarray, absolute_path:str, resource_hash:str, is_bgr:bool):
        if self.debug:
            if resource_hash not in self.hash_2_path:
                self.hash_2_path[resource_hash] = absolute_path
            
        # TODO: later update code in Nim backend to provide transformed landmarks, and aligned faces.
        (bboxes, embeddings, landmarks, matrices) = pipeline.detect_embedding(frame, is_bgr = is_bgr, conf_threshold = self.confidence)
        
        n_bboxes = bboxes.shape[0]
        for i in range(n_bboxes):
            matrix = matrices[i] # original transformation matrix(from new -> old coordinates)
            landmark =  landmarks[i]
                
            new_face = collect_aligned_faces(frame = frame[:,:,::-1], matrix = matrix)
            flag, eyes, _ = collect_eyes(new_face, matrix = matrix, landmarks = landmark, patch_height=6)

            feasibility = False
            if flag == True:                
                temp = get_hog_image(eyes, pixels_per_cell=(4,4))
                
                # if any of reference features seems good enough then ok.
                for reference_hog_image in self.reference_hog_images:
                    scores = compare_hog_image(temp, reference_hog_image)
                    # if max(scores) >= self.hog_threshold:
                    if sum(scores) / (len(scores) + 1e-6) >= self.hog_threshold:
                        feasibility = False
                    else:
                        feasibility = True
                        break
                del temp
            
                    
            # store temporary data for later finalizing.
            # why not store the face-data here .... yeah it takes some extra memory.. but has a limit accoriding to max embeddings count!
            # much faster to calculate !
            temp_data = Auxclusterdata(
                resource_hash = resource_hash,
                absolute_path = absolute_path,
                face_index = i,
                face_preview = self.__get_face_preview(
                    frame = frame,
                    bboxes = bboxes,
                    face_index = i
                ),
                feasibility = feasibility
            )
            self.aux_data.append(temp_data)
            del temp_data
        
        assert len(self.aux_data) == n_bboxes + self.embeddings_count
        
        # if enough data .. then create/merge clusters
        if n_bboxes + self.embeddings_count > self.max_embeddings_count:
            temp_aux_data = self.aux_data[self.embeddings_count:]  # temporary save.. as finalizing will reset all structures
            self.__finalize() # it would also reset the embeddings_count to zero
            assert self.embeddings_count == 0
            assert len(self.aux_data) == 0
            self.aux_data = temp_aux_data
            del temp_aux_data
            
        # update storage with new embeddings
        self.embeddings_storage[self.embeddings_count:self.embeddings_count+n_bboxes,:] = embeddings
        self.embeddings_count += n_bboxes
        
        del embeddings, n_bboxes
    
    # def __get_face_preview(self, absolute_path:os.PathLike, face_index:int):
    
    def __get_face_preview(self, frame:np.ndarray, bboxes:np.ndarray, face_index:int):
    
        """face preview to be used as face for each cluster!
        face_index: int, tells which face master embedding actually belongs to..(stable enough across a session)
        """
        
        # frame = cv2.imread(absolute_path) # i know its costly, but would need to done for only a few times.
        # assert frame is not None
        h,w,c = frame.shape
        # bboxes, _, _, _ = pipeline.detect_embedding(frame, is_bgr = True, conf_threshold = self.confidence)
        bbox = bboxes[face_index]
        
        
        margin = 60
        x1 = int(bbox[0])
        y1 = int(bbox[1])
        x2 = int(bbox[2])
        y2 = int(bbox[3])

        # apply some margin as well. 
        x1 = max(0, x1 - margin)
        x2 = min(w-1, x2 + margin)
        y1 = max(0, y1 - margin)
        y2 = min(h-1, y2 + margin)
        
        preview_face = frame[y1:y2, x1:x2,:]
        preview_face = cv2.resize(preview_face, ((x2 - x1) // 2, (y2 - y1)//2))
        flag, preview_data = cv2.imencode(".webp", preview_face, [cv2.IMWRITE_WEBP_QUALITY, 80])
        
        if flag == False:
            print("[WARNING]: couldn't convert ")
            preview_base64 = np.array([0]).tobytes() # provide a better template...
        else:
            preview_base64 = base64.b64encode(preview_data.tobytes())  # it is a bit costly than saving raw-bytes, sue me!
        del frame
        
        # prefix = "data:image/png;base64," # to be used by browser.
        prefix = ""
        return "{}{}".format(prefix, preview_base64.decode("ascii"))

    # @profile
    def __create_new_clusters(self):
        # TODO: make it faster, after correctness testing on a large set of images!
        embeddings_ref = self.embeddings_storage[:self.embeddings_count] # current stored embeddings.
        master_ids = []
        follower_ids = []
        for idx in range(self.embeddings_count):
            if self.aux_data[idx].feasibility == True:
                master_ids.append(idx)
            else:
                follower_ids.append(idx)
            del idx
                
        # group these master ids into clusters.
        groups = []
        while True:
            if len(master_ids) == 0:
                break
            
            to_delete_ids = []
            group = []
            current_id = master_ids[0]
            group.append(current_id)
            to_delete_ids.append(current_id)
            
            # try merging
            for temp_id in master_ids[1:]:
                if compare_face_embedding(embeddings_ref[current_id], embeddings_ref[temp_id]) <= 1.12:
                    group.append(temp_id)
                    to_delete_ids.append(temp_id)
                del temp_id

            # update master-ids to indicate merged ids.
            for temp_id in to_delete_ids:
                master_ids.remove(temp_id)  # delete id which got merged with current id
                del temp_id
            
            groups.append(group)
            del group, to_delete_ids
        
        del embeddings_ref
        print("groups: {}".format(groups))
        
        # create clusters from current stored/available information..
        temp_clusters =  []
        cluster_prefix = "cluster{}".format(str(uuid.uuid4()).split("-")[0]).lower()  # very low rate of collision !
        for i,group in enumerate(groups):
            # each group is a set of indices for master embeddings in embeddings_storage.
            # each group represents a single cluster.
            master_e   =   [self.embeddings_storage[idx] for idx in group]
            hashes     =   set([self.aux_data[idx].resource_hash for idx  in group])
            assert len(master_e) >= 1
            
            # get the face_index for which group[0] master embedding belongs to frame (referred to by absolute path)
            face_index = self.aux_data[group[0]].face_index  # # just pick a face corresponding to a master embeddings !
            absolute_path = self.aux_data[group[0]].absolute_path # pick the corresponding frame/photo.
            face_preview = self.aux_data[group[0]].face_preview

            c = Cluster(
                master_embeddings = master_e[:self.max_master_embeddings_count],
                id = "{}_{}".format(cluster_prefix, i),   # a prefix to be used while assigning ids to unknown persons.( supposed to be unique enough,                
                resource_hashes = hashes,
                preview_data = face_preview,
                # preview_data = self.__get_face_preview(face_index = face_index, absolute_path = absolute_path),
                label = None # later can be provided by a user.                
            )
            del i
            del face_preview
            
            to_delete_ids = set()  # to keep track of which of nonmaster embeddings has been asigned.            
            for idx in follower_ids:
                e = self.embeddings_storage[idx]
                temp_flag = True
                
                # if all master-embeddings agree..
                for m in c.master_embeddings:
                    temp_flag = temp_flag and can_merge_embedding(e, m, threshold=1.18)
                
                if temp_flag == True:
                    c.resource_hashes.add(self.aux_data[idx].resource_hash)
                    to_delete_ids.add(idx)  # one embedding at-most to one cluster.
                del idx
            for idx in to_delete_ids:
                follower_ids.remove(idx)   # update the follower ids to signal all included ids
            
            del to_delete_ids

            temp_clusters.append(c)
        
        to_delete_ids = []
        for follower_id in follower_ids:
            
            id_scores = []
            for i,c in enumerate(temp_clusters):
                id_scores.append((i, compare_face_embedding(c.master_embeddings[0], self.embeddings_storage[follower_id]))) # just pick one master embedding.
            
            sorted_clusterId_scores = sorted(id_scores, key = lambda x: x[1], reverse = False)
            cluster_id, lowest_score  = sorted_clusterId_scores[0][0], sorted_clusterId_scores[0][1]
            if lowest_score <= self.max_threshold_possible:  # relaxed threshold.
                temp_clusters[cluster_id].resource_hashes.add(self.aux_data[follower_id].resource_hash)
                to_delete_ids.append(follower_id)
            del follower_id, id_scores
        
        for idx in to_delete_ids:
            follower_ids.remove(idx)
        del to_delete_ids

        # We put remaining embeddings/resources into a "specific" cluster.
        flag, poster = cv2.imencode(".png", np.array([[0,0], [0,0]], dtype = np.uint8))
        c_no_info = Cluster(
            master_embeddings = [],
            id = self.no_info_id,
            resource_hashes = set([self.aux_data[idx].resource_hash for idx in follower_ids]),
            preview_data = base64.b64encode(poster.tobytes()).decode("ascii"),
            label = None)
        del follower_ids, poster, flag
        temp_clusters.append(c_no_info)
        del c_no_info

        return temp_clusters
        
    def __merge_clusters(self, new_clusters):
        merged_idx = set()
        not_merged_idx = set()
        ex_clusters = self.id_to_cluster.values()
        for i,new in enumerate(new_clusters):
            
            # first try merging with existing clusters!
            for ex in ex_clusters:
                flag = can_merge(ex, new)
                if flag == True:

                    for h in new.resource_hashes:
                        ex.resource_hashes.add(h)
                    merged_idx.add(i)
                    break

            if i not in merged_idx:
                not_merged_idx.add(i)

        # finally update the ids to clusters mapping.
        print("not merged: ".format(not_merged_idx))
        for ix in not_merged_idx:
            temp_id = new_clusters[ix].id
            assert temp_id not in self.id_to_cluster
            self.id_to_cluster[temp_id] = new_clusters[ix]
        
    def __collect_hash_2_ids(self):
        # NOTE: to be used for a meta-index. (cluster_id as an attribute)

        temp = dict() # hash to cluster_ids mapping.
        for id,c in self.id_to_cluster.items():
            for hash in c.resource_hashes:
                if hash not in temp:
                    temp[hash] = set()
                temp[hash].add(id)
        return temp
    
    def __finalize(self):
        """finalize the current clusters creation and merge process.
        And reset the temporary storage to start storing new embeddings.
        """
        
        new_clusters = self.__create_new_clusters()
        self.__merge_clusters(new_clusters)        
        del new_clusters
        
        # reset temporary-storage
        self.embeddings_count = 0 # it is enough.(to reset the embeddings storage as acting as index.)
        self.aux_data = []
        
    def save(self, finalize:bool = True) -> dict:
        if finalize:
            self.__finalize()
        meta_info = self.__collect_hash_2_ids()

        # save necessary info to disk.
        result = []
        for c in self.id_to_cluster.values():
            json_data = cluster_to_json(c)
            result.append(json_data)
        # TODO: gzip?
        with open(self.index_absolute_path, "w") as f:
            json.dump(result, f)
        return meta_info

    # @profile
    def load(self):
        assert len(self.id_to_cluster) == 0
        # NOTE: may be better ways to deal with saving and loading of data.. like protobuf or stuff!
        assert os.path.exists(self.index_absolute_path)
        with open(self.index_absolute_path, "r") as f:
            json_data = json.load(f)
        
        for cluster_info in json_data:
            # get master embeddings            
            master_embeddings_count = cluster_info["master_embeddings_count"]
            master_embeddings = []
            if master_embeddings_count > 0:                
                hex_encoded_f32_array = cluster_info["master_embeddings"]
                assert len(hex_encoded_f32_array) == self.embedding_size * 8 * master_embeddings_count # 8 since each float32 value takes 8 characters in hex encoding.

                bytes_array  = bytes.fromhex(hex_encoded_f32_array)
                for c in range(master_embeddings_count):
                    temp = np.frombuffer(bytes_array, dtype = np.float32, offset = c*self.embedding_size*4, count = self.embedding_size)
                    master_embeddings.append(temp)

            C = Cluster(
                resource_hashes = set(cluster_info["resource_hashes"]),
                master_embeddings = master_embeddings,
                id = cluster_info["id"],
                label = cluster_info["label"],
                preview_data= cluster_info["preview_data"]
            )
        
            assert C.id not in self.id_to_cluster
            self.id_to_cluster[C.id] = C
            del C

    def reset(self):
        # reset all native data-structures
        self.id_to_cluster = {}

        # temporary ds
        self.aux_data = []
        self.embeddings_count = 0

        # sync to the disk too..
        self.save(finalize=False)


    def get_face_id_mapping(self, image:Union[os.PathLike, np.ndarray], cluster_ids:list[str], is_bgr:bool):
        # we aim to achieve one to one mapping b/w cluster ids provided and bboxes predicted.
        # NOTE: this works on best effort basis, but should not produce `absurd` mappings anyway!
        """
        cluster_ids: list are predicted (original) cluster ids during indexing and can be considered `pure` (can be trusted)
        (so an unexpected cluster id should be considered a strong warning ..)
        each person(detected) in the image is supposed to have an original cluster id.
        """

        if isinstance(image, str):
            assert os.path.exists(image)
            frame = cv2.imread(image)
            is_bgr = True
        else:
            frame  = image        
        
        final_bboxes_ids = [None for _ in range(len(cluster_ids))]
        temp_mapping = {}  # index to clusters

        # create a mapping from original indices to cluster and filter unxpected ids. (should be rare)
        for ix, id in enumerate(cluster_ids):
            if id not in self.id_to_cluster:
                # TODO: make this an error... any unknow id should n;t be here in the first place!
                print("[WARNING]: {} not found, it should be an error. PLEASE UPDATE CODE On the CLIENT SIDE!")
                continue
            elif id == self.no_face_detected_id:
                # we skip it too... (for now i think no_face_detected_id is not used!)
                continue
            elif id == self.no_info_id:
                # we assign this later, to any unassigned bboxes,otherwise current logic could assign undesired bboxes to this id.
                continue
            else:
                temp_mapping[ix] = self.id_to_cluster[id]
        
        (bboxes, embeddings, _, _) = pipeline.detect_embedding(frame, is_bgr = is_bgr, conf_threshold = self.confidence)   
        to_skip = set()
        for stored_ix, c in temp_mapping.items():
            # find the best bbox candidate for this cluster..
            scores = []
            for bbox_ix, (bbox, embedding) in enumerate(zip(bboxes, embeddings)):
                if bbox_ix in to_skip:
                    continue
                assert c.id != self.no_face_detected_id and c.id != self.no_info_id            
                score = min([compare_face_embedding(m, embedding) for m in c.master_embeddings])
                scores.append((bbox_ix,score))
                del score, bbox_ix
            # print(scores)
            # print(bboxes)
            # print(c.id)
            
            if len(scores) > 0:
                sorted_data = sorted(scores, key = lambda x: x[1], reverse = False)
                best_bbox_ix = sorted_data[0][0]
                bbox  = bboxes[best_bbox_ix]

                # update the results at correct index
                final_bboxes_ids[stored_ix] = ([int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])], cluster_ids[stored_ix])
                del bbox

                # assing a bbox to exactly one person in the image!
                to_skip.add(best_bbox_ix)

        # we assign any unassign bboxes to no-info id. (this makes sense if one to one mapping is assumed!)
        for bbox_ix,bbox in enumerate(bboxes):
            if not (bbox_ix in to_skip):
                for ix, temp_id in enumerate(cluster_ids):
                    if temp_id == self.no_info_id and final_bboxes_ids[ix] is None: # no need for and actually both are equivalent for now!
                        final_bboxes_ids[ix] = ([int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])], temp_id)
                        break
            del bbox_ix, bbox

        # rarely may fail to have a bbox for each of persons !
        collect_ix = []
        for ix,x in enumerate(final_bboxes_ids):
            if x is None:
                collect_ix.append(ix)
        
        for ix in collect_ix:
            final_bboxes_ids[ix] = ([int(0), int(0), int(1), int(1)], cluster_ids[ix]) # kind of an empty bbox!
        del collect_ix
        return final_bboxes_ids

    def get(self, cluster_id) -> Cluster:
        """
        Only information is exposed through this get and cluster-id.
        Cluster-id is supposed to be stored in some meta-index or somewhere!
        """
        assert cluster_id in self.id_to_cluster,"{} It must be.. or some error somewhere right!".format(self.id_to_cluster.keys())
        # NOTE: even though a tuple(hence immutable to prevent accidental (direct)updates) but still be careful
        return self.id_to_cluster[cluster_id]
    
    def __repr__(self) -> str:
        data = "Embeddings Count: {}\n".format(self.embeddings_count)
        data = data + "Number of clusters: {}\n".format(len(self.id_to_cluster))
        return data

if __name__ == "__main__":
    # want to understand the bottleneck in (creating ) clustering code.
    # kernprof -l -v <face_clustering.py> # put @profile on the routine.

    # have to disable pipeline , otherwise complaints of dnnl.dll missing..(not in this directory)
    someIndex = FaceIndex(embedding_size = 512)
    print(someIndex)
    images_folder = "D://scripting_python/instagram_photos"
    filenames = os.listdir(images_folder)[:200] 
    for filename in filenames:
        absolute_path = os.path.join(images_folder, filename)
        frame = cv2.imread(absolute_path)
        if frame is None:
            print("not a valid image ! {}".format(absolute_path))
        else:
            someIndex.update(
                frame = frame,
                absolute_path = absolute_path,
                resource_hash = uuid.uuid4().hex,  # just a random for now.
                is_bgr = True
            )
    someIndex.save()
    

