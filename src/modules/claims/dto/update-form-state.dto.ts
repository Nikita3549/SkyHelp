import { IsString } from 'class-validator';

export class UpdateFormStateDto {
    @IsString()
    formState?: string;
}
