import { BadRequestException, Injectable } from '@nestjs/common';
import * as FormData from 'form-data';
import { BoardingPassApiResponse } from './interfaces/boarding-pass-api.response';
import axios, { AxiosError } from 'axios';
import { INVALID_BOARDING_PASS, MEGABYTE } from '../constants';
import { IBoardingPassData } from './interfaces/boarding-pass-data.interface';
import { AirlineService } from '../../airline/airline.service';
import { AirportService } from '../../airport/airport.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BoardingPassService {
    constructor(
        private readonly airlineService: AirlineService,
        private readonly airportService: AirportService,
        private readonly configService: ConfigService,
    ) {}
    async parseBoardingPass(
        files: Express.Multer.File[],
    ): Promise<IBoardingPassData> {
        const form = new FormData();

        for (const file of files) {
            form.append('files', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
        }

        let results: BoardingPassApiResponse[];

        try {
            const { data } = await axios.post<BoardingPassApiResponse[]>(
                this.configService.getOrThrow('BOARDING_PASS_API_URL'),
                form,
                {
                    headers: form.getHeaders(),
                    maxContentLength: MEGABYTE,
                },
            );

            results = data;
        } catch (e) {
            console.log(e);
            if (!(e instanceof AxiosError)) {
                console.error(
                    'unknown error while fetching boarding pass data: ',
                    e,
                );
            }
            throw new BadRequestException(
                `${INVALID_BOARDING_PASS}: error while fetching reader`,
            );
        }

        const boardingPassData = results[0];

        if (
            !boardingPassData?.Flight_number ||
            !boardingPassData?.From ||
            !boardingPassData?.To
        ) {
            throw new BadRequestException(
                `${INVALID_BOARDING_PASS}: invalid flightnumber or airport from or airport to`,
            );
        }

        const airlineIata = boardingPassData.Flight_number.split(' ')[0];

        const flightCode = boardingPassData.Flight_number.split(' ')[1];

        if (!airlineIata || !flightCode) {
            throw new BadRequestException(
                `${INVALID_BOARDING_PASS}: invalid airlineIata or flightCode from reader`,
            );
        }

        const airline = await this.airlineService.getAirlineByIata(airlineIata);

        const departureAirport = await this.airportService.getAirportByIata(
            boardingPassData.From,
        );
        const arrivalAirport = await this.airportService.getAirportByIata(
            boardingPassData.To,
        );

        if (!departureAirport || !arrivalAirport || !airline) {
            throw new BadRequestException(
                `${INVALID_BOARDING_PASS}: invalid departureAirport or arrivalAirport or airline from reader`,
            );
        }

        const departureIso = this.toIso(
            boardingPassData.Departure_Date,
            boardingPassData.Departure_Time,
        );
        const arrivalIso = this.toIso(
            boardingPassData.Arrival_Date,
            boardingPassData.Arrival_Time,
        );

        return {
            passengers: results.map((r) => ({
                passengerName: r.Passenger_Name,
            })),
            bookingRef: boardingPassData.Booking_reference,
            flightNumber: boardingPassData.Flight_number.replace(' ', ''),
            arrivalAirport,
            departureAirport,
            airline,
            departureDate: departureIso,
            arrivalDate: arrivalIso,
        };
    }
    private toIso(date?: string | null, time?: string | null): string | null {
        if (!date || !time) return null;

        const d = new Date(`${date}T${time}`);
        return d.toISOString();
    }
}
