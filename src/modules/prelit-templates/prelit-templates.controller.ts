import {
    Body,
    Controller,
    Get,
    Post,
    Res,
    StreamableFile,
    UseGuards,
} from '@nestjs/common';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { PrelitTemplatesService } from './prelit-templates.service';
import { buildCancellationTemplateDataUtil } from './utils/buildCancellationTemplateData.util';
import { RoleGuard } from '../../common/guards/role.guard';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';
import { buildDelayTemplateDataUtil } from './utils/buildDelayTemplateData.util';
import { buildOverbookingTemplateDataUtil } from './utils/buildOverbookingTemplateData.util';
import { PRELIT_TEMPLATES_FILENAMES } from './consants/prelit-templates-filenames';
import { PrelitStaticDocumentsService } from './prelit-static-documents.service';

@Controller('prelit')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([UserRole.ADMIN, UserRole.AGENT, UserRole.LAWYER]),
)
export class PrelitTemplatesController {
    constructor(
        private readonly prelitTemplatesService: PrelitTemplatesService,
        private readonly prelitStaticDocumentsService: PrelitStaticDocumentsService,
    ) {}

    @Get('documents/default')
    async getDefaultDocument(): Promise<StreamableFile> {
        const file =
            await this.prelitStaticDocumentsService.getDefaultPrelitDocument();

        return new StreamableFile(file, {
            type: 'application/pdf',
            disposition: 'inline; filename: prelit-default-document.pdf',
            length: file.byteLength,
        });
    }

    @Post('cancellation')
    async generateCancellation(@Body() dto: GenerateTemplateDto) {
        const pdfBytes = await this.prelitTemplatesService.fillTemplate(
            buildCancellationTemplateDataUtil(dto),
            PRELIT_TEMPLATES_FILENAMES.CANCELLATION[dto.compensationAmount],
        );

        const buffer = Buffer.from(pdfBytes);

        return new StreamableFile(buffer, {
            type: 'application/pdf',
            length: buffer.length,
        });
    }

    @Post('delay')
    async generateDelay(@Body() dto: GenerateTemplateDto) {
        const pdfBytes = await this.prelitTemplatesService.fillTemplate(
            buildDelayTemplateDataUtil(dto),
            PRELIT_TEMPLATES_FILENAMES.DELAY[dto.compensationAmount],
        );

        const buffer = Buffer.from(pdfBytes);

        return new StreamableFile(buffer, {
            type: 'application/pdf',
            length: buffer.length,
        });
    }

    @Post('overbooking')
    async generateOverbooking(@Body() dto: GenerateTemplateDto) {
        const pdfBytes = await this.prelitTemplatesService.fillTemplate(
            buildOverbookingTemplateDataUtil(dto),
            PRELIT_TEMPLATES_FILENAMES.OVERBOOKING[dto.compensationAmount],
        );

        const buffer = Buffer.from(pdfBytes);

        return new StreamableFile(buffer, {
            type: 'application/pdf',
            length: buffer.length,
        });
    }
}
