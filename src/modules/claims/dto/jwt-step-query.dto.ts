import { IsJWT, IsNumber } from 'class-validator';

export class JwtStepQueryDto {
    @IsJWT()
    jwt: string;

    @IsNumber()
    step: number;
}
