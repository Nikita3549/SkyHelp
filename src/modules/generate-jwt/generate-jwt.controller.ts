import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { GenerateJwtDto } from './dto/generate-jwt.dto';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { IsAdminGuard } from '../../guards/isAdminGuard';

@Controller('jwt')
export class GenerateJwtController {
    constructor(private readonly tokenService: TokenService) {}

    @Post()
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    generateJwt(@Body() dto: GenerateJwtDto) {
        const { claimId } = dto;

        return this.tokenService.generateJWT({ claimId });
    }
}
