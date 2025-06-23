// Configuration utilities for the vanilla frontend
class Config {
    static get apiUrl(): string {
        return (window as any).config?.apiUrl || 'http://localhost:5000/api';
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
}

const endpoints = new Endpoints();
export { endpoints };



export default Config;
