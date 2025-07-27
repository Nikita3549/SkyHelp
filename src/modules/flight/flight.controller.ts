import {
    BadRequestException,
    Body,
    Controller,
    Post,
    UseGuards,
} from '@nestjs/common';
import { FlightService } from './flight.service';
import { GetFlightsDto } from './dto/get-flights.dto';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { INVALID_FLIGHT_DATA } from './constants';

@Controller('flights')
export class FlightController {
    constructor(private readonly flightService: FlightService) {}

    @Post()
    async getFlights(@Body() dto: GetFlightsDto) {
        const flights = await this.flightService
            .getFlightsByDateAirportsCompany(dto)
            .catch((e: unknown) => {
                throw new BadRequestException(INVALID_FLIGHT_DATA);
            });

        return flights;
    }
}
