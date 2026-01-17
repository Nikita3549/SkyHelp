import { Injectable } from '@nestjs/common';
import { FlightDto } from './dto/flight.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DetailService {
    constructor(private readonly prisma: PrismaService) {}

    async updateDetails(dto: FlightDto, claimId: string) {
        if (dto?.arrivalAirport) {
            await this.prisma.arrivalAirport
                .update({
                    where: {
                        id: dto.arrivalAirport.id,
                    },
                    data: {
                        ...dto.arrivalAirport,
                    },
                })
                .catch();
        }
        if (dto?.departureAirport) {
            await this.prisma.departureAirport
                .update({
                    where: {
                        id: dto.departureAirport.id,
                    },
                    data: {
                        ...dto.departureAirport,
                    },
                })
                .catch();
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
                airlineLink: dto.airlineLink,
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
