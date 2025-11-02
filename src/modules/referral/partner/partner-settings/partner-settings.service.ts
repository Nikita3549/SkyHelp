import { Injectable } from '@nestjs/common';
import { UpdatePartnerSettingsDto } from './dto/update-partner-settings.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PartnerSettingsService {
    constructor(private readonly prisma: PrismaService) {}

    async getPartnerSettings(partnerId: string) {
        return this.prisma.partnerSettings.findFirst({
            where: {
                partner: {
                    id: partnerId,
                },
            },
        });
    }

    async updatePartnerSettings(
        data: UpdatePartnerSettingsDto,
        userId: string,
    ) {
        const settings = await this.prisma.partnerSettings.updateManyAndReturn({
            data,
            where: {
                partner: {
                    userId,
                },
            },
        });

        return settings[0];
    }
}
