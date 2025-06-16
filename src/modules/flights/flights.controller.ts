import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { GetFlightsDto } from './dto/get-flights.dto';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';

@Controller('flights')
export class FlightsController {
    constructor(private readonly flightService: FlightsService) {}

    @Post()
    async getFlights(@Body() dto: GetFlightsDto) {
        return this.flightService.getFlightsByDateAirportsCompany(dto);
    }
}
