import { IsJWT } from 'class-validator';

export class JwtQueryDto {
    @IsJWT()
    jwt: string;
}
