import { IsJWT, IsNumber } from 'class-validator';

export class JwtQueryDto {
    @IsJWT()
    jwt: string;

    @IsNumber()
    step: number;
}
