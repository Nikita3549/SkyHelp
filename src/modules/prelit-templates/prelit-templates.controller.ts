import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { PrelitTemplatesService } from './prelit-templates.service';
import { Readable } from 'stream';
import { Response } from 'express';
import { buildCancellationTemplateDataUtil } from './utils/buildCancellationTemplateData.util';
import { RoleGuard } from '../../common/guards/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';
import { buildDelayTemplateDataUtil } from './utils/buildDelayTemplateData.util';
import { buildOverbookingTemplateDataUtil } from './utils/buildOverbookingTemplateData.util';
import { PRELIT_TEMPLATES_FILENAMES } from './consants/prelit-templates-filenames';

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
            PRELIT_TEMPLATES_FILENAMES.CANCELLATION[dto.compensationAmount],
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
            PRELIT_TEMPLATES_FILENAMES.DELAY[dto.compensationAmount],
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
            PRELIT_TEMPLATES_FILENAMES.OVERBOOKING[dto.compensationAmount],
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
