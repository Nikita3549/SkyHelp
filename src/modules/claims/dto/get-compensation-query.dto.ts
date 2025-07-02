import { IsString } from 'class-validator';

export class GetCompensationQueryDto {
    @IsString()
    depIcao: string;

    @IsString()
    arrIcao: string;
}
