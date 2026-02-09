export interface ExtractSignatureMatchResponse {
    match_score: number;
    reasoning: string;
    passport_image_base64: string;
    cropped_signatures_base64?: string[];
}
