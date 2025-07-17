import { IsJWT, IsNumber } from 'class-validator';
import { LanguageQueryDto } from './language-query.dto';

export class JwtStepQueryDto extends LanguageQueryDto {
    @IsJWT()
    jwt: string;

    @IsNumber()
    step: number;
}
