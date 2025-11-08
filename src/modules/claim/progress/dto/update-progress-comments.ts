import { IsString } from 'class-validator';

export class UpdateProgressComments {
    @IsString()
    comments: string;
}
