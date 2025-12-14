import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { PrelitTemplatesService } from './prelit-templates.service';
import { Readable } from 'stream';
import { Response } from 'express';
import { buildCancellationTemplateDataUtil } from './utils/buildCancellationTemplateData.util';
import {
    FLYONE_RO_250_CANCELLATION_FILENAME,
    FLYONE_RO_250_DELAY_FILENAME,
    FLYONE_RO_250_OVERBOOKING_FILENAME,
} from './consants';
import { RoleGuard } from '../../common/guards/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';
import { buildDelayTemplateDataUtil } from './utils/buildDelayTemplateData.util';
import { buildOverbookingTemplateDataUtil } from './utils/buildOverbookingTemplateData.util';

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
        @Body() dto: GenerateTemplateDto,
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

    @Post('delay')
    async generateDelay(
        @Body() dto: GenerateTemplateDto,
        @Res() res: Response,
    ) {
        const pdfBytes = await this.prelitTemplatesService.fillTemplate(
            buildDelayTemplateDataUtil(dto),
            FLYONE_RO_250_DELAY_FILENAME,
        );

        const buffer = Buffer.from(pdfBytes);

        const stream = Readable.from(buffer);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': buffer.length,
        });

        stream.pipe(res);
    }

    @Post('overbooking')
    async generateOverbooking(
        @Body() dto: GenerateTemplateDto,
        @Res() res: Response,
    ) {
        const pdfBytes = await this.prelitTemplatesService.fillTemplate(
            buildOverbookingTemplateDataUtil(dto),
            FLYONE_RO_250_OVERBOOKING_FILENAME,
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
