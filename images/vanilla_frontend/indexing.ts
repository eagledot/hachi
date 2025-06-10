export interface IndexingStats {
    image: {
        count: number;
        unique_people_count: number;
        unique_place_count: number;
    }
}

export interface IndexStatusResponse {
    done: boolean;
    progress: number;
    eta: string;
    details: string;
    current_directory: string;
    is_active?: boolean;
}

export interface IndexStartRequest {
    image_directory_path: string;
    complete_rescan: "true" | "false";
}

export interface IndexStartResponse {
    success: boolean;
    statusEndpoint?: string;
    reason?: string;
}

export interface AckRequest {
    ack: string;
}
