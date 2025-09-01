import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { GenerateJwtDto } from './dto/generate-jwt.dto';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { IsPartnerOrAgentGuard } from '../../guards/isPartnerOrAgentGuard';

@Controller('jwt')
export class GenerateJwtController {
    constructor(private readonly tokenService: TokenService) {}

    @Post()
    @UseGuards(JwtAuthGuard, IsPartnerOrAgentGuard)
    generateJwt(@Body() dto: GenerateJwtDto) {
        const { claimId } = dto;

        return this.tokenService.generateJWT({ claimId });
    }
}
