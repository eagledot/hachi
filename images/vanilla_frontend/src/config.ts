// Configuration utilities for the vanilla frontend
class Config {
    static get apiUrl(): string {
        console.log("THE API URL IS: ", import.meta.env.VITE_API_URL || "/api");
        return import.meta.env.VITE_API_URL;
    }
}

const BASE_URL = import.meta.env.VITE_API_URL || "";

class Endpoints {
    GET_PARTITIONS = BASE_URL + "/api/getPartitions";
    GET_SUGGESTION_PATH = BASE_URL + "/api/getSuggestionPath";
    SELECT_FOLDER = BASE_URL + "/api/select-folder";
    INDEX_START = BASE_URL + "/api/indexStart";
    IMAGE_SEARCH = BASE_URL + "/api/query";
    COLLECT_QUERY_META = BASE_URL + "/api/collectQueryMeta"
    GET_PREVIEW_IMAGE = BASE_URL + "/preview_image"
    GET_SUGGESTIONS = BASE_URL + "/api/getSuggestion"
    GET_IMAGE = BASE_URL +  "/api/getRawDataFull"
    GET_PERSON_IMAGE = BASE_URL + "/api/getPreviewPerson"
    GET_PERSON_PHOTOS = BASE_URL + "/api/getMeta/person"
    GET_PEOPLE = BASE_URL + "/api/getGroup/person"
}

const endpoints = new Endpoints();
export { endpoints };



export default Config;
