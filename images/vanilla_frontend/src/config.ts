// Configuration utilities for the vanilla frontend
class Config {
    static get apiUrl(): string {
        console.log("THE API URL IS: ", import.meta.env.VITE_API_URL || "/api");
        return import.meta.env.VITE_API_URL || "/api";
    }
    static get endpoints(): {[key: string] : string} {
        return {
            GET_PARTITIONS: "/getPartitions"
        };
    }
}

const BASE_URL = Config.apiUrl;

class Endpoints {
    GET_PARTITIONS = BASE_URL + "/getPartitions";
    GET_SUGGESTION_PATH = BASE_URL + "/getSuggestionPath";
    SELECT_FOLDER = BASE_URL + "/select-folder";
    INDEX_START = BASE_URL + "/indexStart";
}

const endpoints = new Endpoints();
export { endpoints };



export default Config;
