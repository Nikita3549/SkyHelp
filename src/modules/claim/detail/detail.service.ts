import { Injectable } from '@nestjs/common';
import { FlightDto } from './dto/flight.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DetailService {
    constructor(private readonly prisma: PrismaService) {}

    async updateDetails(dto: FlightDto, claimId: string) {
        return this.prisma.claimDetails.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { detailsId: true },
                    })
                ).detailsId,
            },
            data: {
                flightNumber: dto.flightNumber,
                date: new Date(dto.date),
                bookingRef: dto.bookingRef,
            },
        });
    }
}
