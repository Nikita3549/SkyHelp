import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FlightService } from './flight.service';
import { GetFlightsDto } from './dto/get-flights.dto';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';

@Controller('flights')
export class FlightController {
    constructor(private readonly flightService: FlightService) {}

    @Post()
    async getFlights(@Body() dto: GetFlightsDto) {
        return this.flightService.getFlightsByDateAirportsCompany(dto);
    }
}
