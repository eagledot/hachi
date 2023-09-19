# imports
import os



def generate_endpoint(directory_path) -> str:
    assert os.path.exists(directory_path)
    statusEndpoint = os.path.abspath(directory_path).replace("/", "-")
    statusEndpoint = statusEndpoint.replace('\\',"-")
    return statusEndpoint

def parse_query(query:str) -> dict[str, list[str]]:
    """ parse a query.
        a mapping from an image-attribute to a list with possible values.
        "person" -> [x,y,z]
    """
    
    temp_query = query.strip().lower().split(",")
    imageAttributes_2_values = {}
    for x in temp_query:
        temp_x = x.strip().split(":")
        attribute = temp_x[0].strip()

        values = []
        for v in temp_x[1].strip().split("-"):
            if len(v.strip()) > 0:
                values.append(v.strip())

        if len(attribute) == 0 or len(values) == 0:
            continue

        imageAttributes_2_values[attribute] = values
    return imageAttributes_2_values