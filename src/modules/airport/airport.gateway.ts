import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
    InternalServerErrorException,
    UseFilters,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ValidationFilter } from './filters/validation.filter';
import { LookupAirportDto } from './dto/lookup-airport.dto';
import { AirportService } from './airport.service';
import { CacheService } from '../cache/cache.service';

@WebSocketGateway({ namespace: '/ws/airports' })
@UseFilters(new ValidationFilter())
@UsePipes(new ValidationPipe({ transform: true }))
export class AirportGateway {
    constructor(
        private readonly airportsService: AirportService,
        private readonly cacheService: CacheService,
    ) {}

    @SubscribeMessage('lookupAirportCode')
    async handleLookupAirportCode(_client: Socket, dto: LookupAirportDto) {
        const { name: airportName } = dto;
        if (airportName.length <= 1) {
            return [];
        }
        const formatedAirportName = airportName.toLowerCase().trim();
        const cache = await this.cacheService.getCache(
            `airports-${formatedAirportName}`,
        );

        if (cache) {
            return JSON.parse(cache);
        }

        const airports = await this.airportsService
            .getAirportsByName(formatedAirportName)
            .catch((e: unknown) => {
                console.error(e);
                throw new InternalServerErrorException();
            });

        this.cacheService.setCache(
            `airports-${formatedAirportName}`,
            JSON.stringify(airports),
        );

        return airports;
    }
}
