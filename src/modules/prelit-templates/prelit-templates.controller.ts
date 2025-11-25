import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { GenerateCancellationDto } from './dto/generate-cancellation.dto';
import { PrelitTemplatesService } from './prelit-templates.service';
import { Readable } from 'stream';
import { Response } from 'express';
import { buildCancellationTemplateDataUtil } from './utils/buildCancellationTemplateData.util';
import { FLYONE_RO_250_CANCELLATION_FILENAME } from './consants';
import { RoleGuard } from '../../guards/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';

@Controller('prelit')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([UserRole.ADMIN, UserRole.AGENT, UserRole.LAWYER]),
)
export class PrelitTemplatesController {
    constructor(
        private readonly prelitTemplatesService: PrelitTemplatesService,
    ) {}
    @Post('cancellation')
    async generateCancellation(
        @Body() dto: GenerateCancellationDto,
        @Res() res: Response,
    ) {
        const pdfBytes = await this.prelitTemplatesService.fillTemplate(
            buildCancellationTemplateDataUtil(dto),
            FLYONE_RO_250_CANCELLATION_FILENAME,
        );

        const buffer = Buffer.from(pdfBytes);

        const stream = Readable.from(buffer);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': buffer.length,
        });

        stream.pipe(res);
    }
}
