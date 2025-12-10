import { Injectable } from '@nestjs/common';
import { FlightDto } from './dto/flight.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DetailService {
    constructor(private readonly prisma: PrismaService) {}

    async updateDetails(dto: FlightDto, claimId: string) {
        if (dto?.arrivalAirport) {
            await this.prisma.arrivalAirport.updateMany({
                where: {
                    id: dto.arrivalAirport.id,
                },
                data: {
                    ...dto.arrivalAirport,
                },
            });
        }
        if (dto?.departureAirport) {
            await this.prisma.departureAirport.updateMany({
                where: {
                    id: dto.departureAirport.id,
                },
                data: {
                    ...dto.departureAirport,
                },
            });
        }

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
                airlines: dto.airline
                    ? {
                          update: {
                              ...(dto.airline.icao && {
                                  icao: dto.airline.icao,
                              }),
                              ...(dto.airline.iata && {
                                  iata: dto.airline.iata,
                              }),
                              ...(dto.airline.name && {
                                  name: dto.airline.name,
                              }),
                          },
                      }
                    : undefined,
            },
        });
    }
}
