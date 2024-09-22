
from typing import Union, Optional, Iterable, Dict
from threading import RLock

from tlsh_python_port import from_hex, h_distance, CODE_SIZE, mod_diff, RANGE_LVALUE, RANGE_QRATIO, getQLo, getQHi, bit_pairs_diff_table, Uint8Array, Tlsh
import tlsh_python_module as tlsh_nim  # python extension.

def augment_data(data:str) -> str:
    FREQUENCY = "etaonrishdlfcmugypwbvkjxzq"
    sample_dict = {}
    for i, character in enumerate(FREQUENCY):
        sample_dict[character] = FREQUENCY[len(FREQUENCY) -1 -i]

    random_string = "this is {}-{}-{} destined to be a value, otherwise would not have enough variation to begin with in the first place."

    for d in data:
        random_string = random_string.replace(d,"*")

    new_data = ""
    for d in data:
        if d in sample_dict:
            new_data += sample_dict[d]
        else:
            new_data += d
    
    return random_string.format(new_data, new_data, new_data )

def compare_tlsh_hash(hash_1:str, hash_2:str, len_diff:bool = True):
    assert len(hash_1) == len(hash_2) == (CODE_SIZE + 3)*2   #hash_1, hash_2  hexdigest, each of 70 characters.

    # need checksum, Lvalue, Qvalue.
    checksum_1 = hash_1[:2]  # 1 byte for checksum, hence 2 hex characters.
    checksum_1 = int(checksum_1[1] + checksum_1[0], base = 16)  # need to swap bytes.
    
    checksum_2 = hash_2[:2]  # 1 byte for checksum, hence 2 hex characters.
    checksum_2 = int(checksum_2[1] + checksum_2[0], base = 16)  # need to swap bytes.

    # L value 1 byte
    Lvalue_1 = hash_1[2:4]  # 1 byte for checksum, hence 2 hex characters.
    Lvalue_1 = int(Lvalue_1[1] + Lvalue_1[0], base = 16)  # need to swap bytes.
    
    Lvalue_2 = hash_2[2:4]  # 1 byte for checksum, hence 2 hex characters.
    Lvalue_2 = int(Lvalue_2[1] + Lvalue_2[0], base = 16)  # need to swap bytes.

    # L value 1 byte
    Qvalue_1 = hash_1[4:6]  # 1 byte for checksum, hence 2 hex characters.
    Qvalue_1 = int(Qvalue_1[1] + Qvalue_1[0], base = 16)  # need to swap bytes.
    
    Qvalue_2 = hash_2[4:6]  # 1 byte for checksum, hence 2 hex characters.
    Qvalue_2 = int(Qvalue_2[1] + Qvalue_2[0], base = 16)  # need to swap bytes.

    diff = 0

    # in case want to include the file-length information in total distance.
    if (len_diff):
        ldiff = mod_diff(Lvalue_1, Lvalue_2, RANGE_LVALUE)
        if (ldiff == 0):
            diff = 0
        elif (ldiff == 1):
            diff = 1
        else:
            diff += ldiff * 12   # read paper to know the significance of 12.
        
    q1diff = mod_diff( getQLo(Qvalue_1) , getQLo(Qvalue_2), RANGE_QRATIO)
    if (q1diff <= 1):
        diff += q1diff
    else:
        diff += (q1diff - 1)*12
    
    q2diff = mod_diff( getQHi(Qvalue_1), getQHi(Qvalue_2), RANGE_QRATIO)
    if (q2diff <=1 ):
        diff += q2diff
    else:
        diff += (q2diff - 1)*12

    # NOTE: Assuming 1 byte checksum only.
    if (checksum_1) != checksum_2:
        diff +=1 
    
    tmpCode_1 = from_hex(hash_1[6:])
    tmpCode_1.reverse()

    tmpCode_2 = from_hex((hash_2[6:]))
    tmpCode_2.reverse()
    
    diff += h_distance(bit_pairs_diff_table, CODE_SIZE, tmpCode_1, tmpCode_2)
    return diff

def first_character_comparison(original_query:str, data:str) -> int:

        original_chars = {}
        
        DELETE_WORDS = ["a", "an", "the", "and", "in", "of", "this"] # TODO: create a better list..

        for d in original_query.strip().split(" "):
            if len(d) == 0 or d in DELETE_WORDS:
                continue
            
            if d[0] not in original_chars:
                original_chars[d[0]] = 1
            else:
                original_chars[d[0]] += 1
        
        data_chars = {}
        for d in data.strip().split(" "):
            if len(d) == 0 or d in DELETE_WORDS:
                continue
            if d[0] not in data_chars:
                data_chars[d[0]] = 1
            else:
                data_chars[d[0]] += 1
        
        common_keys = set(original_chars.keys()).intersection(set(data_chars.keys()))
        score = 0
        for k in common_keys:
            score +=  min(original_chars[k], data_chars[k])
        return score

class FuzzySearch(object):
    def __init__(self) -> None:
        self.lock = RLock()

        # data-structure to hold the data.
        self.firstChar_to_hash = {}    # we use the first character as the key.
        self.rigid_strings = []        # to keep the strings, for whom an usable hash couldnot be create. or use a FIXED HASH VALUE To indicate such strings.

        self.hash_2_originalData = {}   # map a hash to the original string. original strings can be kept into a set. THIS CAN BE MAPPED TO ORIGINAL IMAGE HASHES.
        self.originalData_2_auxiliaryData = {}  # this is optional, in case we want to return some data other than original data, can be mapped to any auxiliary data.

    def add(self, data:str, auxiliaryData: Optional[str] = None):

        assert isinstance(data, str)
        data = data.strip().lower()
        if len(data) == 0:
            return
        
        # map original data --> auxiliary data , to later return corresponding auxiliary data given originaldata.
        if data not in self.originalData_2_auxiliaryData:
            self.originalData_2_auxiliaryData[data] = set()
        self.originalData_2_auxiliaryData[data].add(auxiliaryData)  #original data could point to a set of auxiliary values.

        
        for temp_d in data.split(" "):  # 
            if len(temp_d) == 0:
                continue
            key = temp_d[0]

            # generate LSH hash
            data_augmented = augment_data(temp_d)
            flag, hash = tlsh_nim.generate_tlsh_hash(data_augmented.encode("utf8"))     # much faster than pure python/legacy.
            
            with self.lock:
                if flag:
                    if key not in self.firstChar_to_hash:
                        self.firstChar_to_hash[key] = set()   # if a word in two movie titles, then hash(word) and key would be same, so use SET to deduplicate.
                    
                    if hash not in self.hash_2_originalData:
                        self.hash_2_originalData[hash] = set()

                    self.firstChar_to_hash[key].add(hash)
                    self.hash_2_originalData[hash].add(data)  # map a hash to original data, for when we get some hashes, we can readily get the corresponding data.
                    
                else:
                    self.rigid_strings.append(temp_d)

    def query(self, query:str, top_k = 24) -> Dict[str, float]:
        
        PERFECT_SCORE = 1000
        query_original = query.strip().lower()
        result_hashes = []                    

        for query in query_original.split(" "):
            if len(query) == 0:
                continue
            
            # calculate hash for current query.
            query_augmented = augment_data(query)

            flag, query_hash = tlsh_nim.generate_tlsh_hash(query_augmented.encode("utf8")) # using C extension to speed up.
            query_hash = query_hash.lower()

            if flag == False:
                print("this should not happen... but we would search anyway..")
            
            # based on the first character of query, collect the stored hashes.
            key = query[0]
            with self.lock:
                if key in self.firstChar_to_hash:
                    temp_hashes = self.firstChar_to_hash[key]                    
                else:
                    continue

            # Sort collected based on the distance with the current query hash in default ascending order. (lower is better.)
            tmp = []
            for h in temp_hashes:
                temp_distance = tlsh_nim.compare_tlsh_hash(query_hash, h)
                tmp.append((h, max(0,  (PERFECT_SCORE - temp_distance)/PERFECT_SCORE)))            
            result_hashes = result_hashes + sorted(tmp, key = lambda x: x[1], reverse = True)[:top_k]

      
        final_result_scores = {}
        for h,score in result_hashes:
            keys = self.hash_2_originalData[h]  # all the strings/movie-titles pointed to by the hash h.
            assert isinstance(keys, set)       # to make sure we inadverently not change the architecture.
            for k in keys:
                if k not in final_result_scores:
                    final_result_scores[k] = score
                else:
                    final_result_scores[k] = max(final_result_scores[k], int(score < 0.98)*0 + int(score >= 0.98)*(score + final_result_scores[k]))  # selectively update, if h is a perfect match include the contribution

        for k in final_result_scores.keys():
            final_result_scores[k] *= first_character_comparison(query_original, k)

        final_titles = sorted(final_result_scores.keys(), key = lambda x: final_result_scores[x], reverse= True)[:20]    
        temp = {}
        for title in final_titles:
            temp[title] = final_result_scores[title]
        return temp
    
    def get_auxiliary_data(self, original_data:str) -> Optional[Iterable[str]]:

        result = None
        key = original_data
        if key in self.originalData_2_auxiliaryData:
            result = self.originalData_2_auxiliaryData[key]
        return result
    
    def get_original_data(self) -> Iterable[str]:
        """ return an iterable for all the unique original value stored."""
        return self.originalData_2_auxiliaryData.keys()

        
