export interface IExtractPassportResponse {
    passport_hash: string;
    status: 'success' | 'success_gemini_fallback' | 'error';
    extracted_data: ExtractedData;
    signature_bounding_boxes: BoundingBox[];
}

interface ExtractedData {
    surname: string;
    given_names: string;
    sex: 'M' | 'F' | 'X';
    nationality: string;
    place_of_birth: string;
    personal_id_number: string;
    passport_number: string;
    date_of_issue: string;
    date_of_expiry: string;
    issuing_authority: string;
    country_code: string;
    mrz: string;
}

interface BoundingBox {
    min_y: number;
    min_x: number;
    max_y: number;
    max_x: number;
}
