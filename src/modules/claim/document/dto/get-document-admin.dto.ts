import { IsString } from 'class-validator';

export class GetDocumentAdminDto {
    @IsString()
    documentId: string;
}
