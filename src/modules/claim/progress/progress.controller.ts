import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsModeratorGuard } from '../../../guards/isModerator.guard';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ProgressService } from './progress.service';

@Controller('claims/progresses')
@UseGuards(JwtAuthGuard)
export class ProgressController {
    constructor(private readonly progressesService: ProgressService) {}
    @UseGuards(IsModeratorGuard)
    @Put(':progressId')
    async updateProgress(
        @Body() dto: UpdateProgressDto,
        @Param('progressId') progressId: string,
    ) {
        return this.progressesService.updateProgress(
            {
                title: dto.title,
                description: dto.description,
                endAt: dto.endAt ? new Date(dto.endAt) : null,
                status: dto.status,
                order: dto.order,
            },
            progressId,
        );
    }
}
