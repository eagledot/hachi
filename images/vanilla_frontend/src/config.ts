// Configuration utilities for the vanilla frontend
class Config {
    static get apiUrl(): string {
        return (window as any).config?.apiUrl || 'http://localhost:5000/api';
    }
}

export default Config;
