import { IsEnum, IsOptional } from 'class-validator';
import { SignedUrlDisposition } from '../../s3/enums/signed-url-disposition.enum';

export class GetAttachmentDto {
    @IsOptional()
    @IsEnum(SignedUrlDisposition)
    disposition: SignedUrlDisposition = SignedUrlDisposition.attachment;
}
