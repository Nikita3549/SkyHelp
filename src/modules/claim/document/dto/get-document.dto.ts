import { IsString } from 'class-validator';

export class GetDocumentDto {
    @IsString()
    documentId: string;
}
