export interface IZohoWebhookBody {
    requests: {
        request_status: string;
        owner_email: string;
        document_ids: Array<{ [key: string]: any }>;
        self_sign: boolean;
        owner_id: string;
        request_name: string;
        modified_time: number;
        action_time: number;
        is_deleted: boolean;
        is_sequential: boolean;
        org_id: string;
        owner_first_name: string;
        request_type_name: string;
        owner_last_name: string;
        request_id: string;
        request_type_id: string;
        zsdocumentid: string;
        actions: Array<Array<{ [key: string]: any }>>;
    };
    notifications: {
        performed_by_email: string;
        performed_at: number;
        country: string;
        activity: string;
        operation_type: string;
        action_id: string;
        latitude: number;
        performed_by_name: string;
        signing_order: number;
        ip_address: string;
        longitude: number;
    };
}
