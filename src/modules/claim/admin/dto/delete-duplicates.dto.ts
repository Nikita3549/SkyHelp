import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class DeleteDuplicatesDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    claimIds: string[];
}
