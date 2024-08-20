
from typing import Tuple
import numpy as np
import os

class GeocodeIndex(object):
    def __init__(self, separator = ",", quote_character = '"'):
        
        this_file_directory = os.path.dirname(os.path.abspath(__file__))
        self.data_path = os.path.join(this_file_directory , "./cities15000/cities15000_modified.csv")
        self.col_2_data = {}

        self.quote_character = quote_character
        with open(self.data_path, "r", encoding="utf8") as f:
            self.col_keys = f.readline().strip().split(separator)  # zeroth row is assumed to be header.

            for k in self.col_keys:
                self.col_2_data[k] = []

            count = 0
            for line in f.readlines():
                temp_line = line.strip()
                start_idx = 0
                line_data = []
                while True:
                    end_idx = temp_line.find(separator, start_idx)
                    
                    if end_idx == -1:
                        item = temp_line[start_idx:]
                        line_data.append(item.strip())
                        break
                    
                    item = temp_line[start_idx:end_idx]
                    if self.quote_character in item:
                        quote_start_idx = temp_line.find(self.quote_character,start_idx)
                        quote_end_idx = temp_line.find(self.quote_character, quote_start_idx + 1)
                        item = temp_line[quote_start_idx+1: quote_end_idx]
                        
                        assert quote_end_idx != -1, "{} ".format(item)
                        line_data.append(item.strip())
                        start_idx = temp_line.find(separator, quote_end_idx)
                        
                        if (start_idx == -1):
                            break
                        else:
                            start_idx += 1
                    else:
                        line_data.append(item.strip())
                        start_idx = end_idx + 1

                for i,k in enumerate(self.col_keys):
                    self.col_2_data[k].append(line_data[i])
                count += 1

        latitude_array = np.array(self.col_2_data["latitude"], dtype = "float32").reshape(-1,1)
        longitude_array = np.array(self.col_2_data["longitude"], dtype = "float32").reshape(-1,1)
        self.lat_long = np.concatenate([latitude_array, longitude_array], axis = -1)

    def query(self, query_coords:Tuple[float, float]) -> str:
        # given query coordinates in latitude longitude format, query the database to get nearest gps coordinates.
        # and then collect the corresponding city(ascii name) and the country. 

        gps_latitude = query_coords[0]
        gps_longitude = query_coords[1]
        if(isinstance(gps_latitude, str)):
            gps_latitude = float(gps_latitude)
        if (isinstance(gps_longitude, str)):
            gps_longitude = float(gps_longitude)
        
        if (gps_latitude is None) or (gps_longitude is None):
            return "no location information"

        temp_arr = np.array([gps_latitude, gps_longitude]).astype("float32").reshape(1,2)
        distance = (self.lat_long - temp_arr)
        distance = np.sum(np.square(distance), axis = -1)    # no need to sqrt, since monotonic for x > 0.
        temp_index =  np.argsort(distance)[0].item()         # get the one with the shortest distance.

        result = "{} {}".format(self.col_2_data["asciiname"][temp_index], self.col_2_data["country"][temp_index])                           
        return result