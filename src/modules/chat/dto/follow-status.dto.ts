import { IsString } from 'class-validator';

export class FollowStatusDto {
    @IsString()
    userId: string;
}
