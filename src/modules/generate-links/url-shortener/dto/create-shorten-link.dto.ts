import { IsString } from 'class-validator';

export class CreateShortenLinkDto {
    @IsString()
    originalUrl: string;
}
