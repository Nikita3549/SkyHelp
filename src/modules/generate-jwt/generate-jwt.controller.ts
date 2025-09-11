import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { GenerateJwtDto } from './dto/generate-jwt.dto';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { IsPartnerOrAgentGuard } from '../../guards/isPartnerOrAgentGuard';
import { CONTINUE_LINKS_EXP } from '../claim/constants';
import { VerifyJwtDto } from './dto/verify-jwt.dto';

@Controller('jwt')
export class GenerateJwtController {
    constructor(private readonly tokenService: TokenService) {}

    @Post()
    @UseGuards(JwtAuthGuard, IsPartnerOrAgentGuard)
    async generateJwt(@Body() dto: GenerateJwtDto) {
        const { claimId } = dto;

        return this.tokenService.generateJWT(
            { claimId },
            { expiresIn: CONTINUE_LINKS_EXP },
        );
    }

    @Post('verify')
    async verify(@Body() dto: VerifyJwtDto) {
        const { jwt } = dto;

        let isValid: boolean;
        try {
            await this.tokenService.verifyJWT(jwt);

            isValid = true;
        } catch (e) {
            isValid = false;
        }

        return {
            isValid,
        };
    }
}
