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
    GET_FOLDERS = BASE_URL + "/api/getGroup/resource_directory"
    GET_FOLDER_IMAGES = BASE_URL + "/api/getMeta/resource_directory"
    GET_META_STATS = BASE_URL + "/api/getMetaStats"
    TAG_PERSON = BASE_URL + "/api/tagPerson"
    QUERY_ATTRIBUTE = (attribute: string, value: string, pageSize: number) => {
        return `${BASE_URL}/api/queryAttribute/${attribute}/${value}/${pageSize}`;
    }
    COLLECT_ATTRIBUTE_META = (token: string, pageId: number) => {
        return `${BASE_URL}/api/collectAttributeMeta/${token}/${pageId}`;
    }
    FILTER_POPULATE_QUERY = (queryToken: string, attribute: string) => {
        return `${BASE_URL}/api/filterPopulateQuery/${queryToken}/${attribute}`;
    }

    FILTER_QUERY_META = (queryToken: string, attribute: string, value: string) => {
        return `${BASE_URL}/api/filterQueryMeta/${queryToken}/${attribute}/${value}`;
    }
}

const endpoints = new Endpoints();
export { endpoints };



export default Config;
