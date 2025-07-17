import { Injectable } from '@nestjs/common';
import { IssueDto } from './dto/issue.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IssueService {
    constructor(private readonly prisma: PrismaService) {}

    async updateIssue(dto: IssueDto, claimId: string) {
        return this.prisma.claimIssue.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { issueId: true },
                    })
                ).issueId,
            },
            data: {
                disruptionType: dto.flightIssue,
                airlineReason: dto.reasonGivenByAirline,
                additionalInfo: dto.additionalInformation,
            },
        });
    }
}
