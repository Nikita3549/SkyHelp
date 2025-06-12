import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
    InternalServerErrorException,
    UseFilters,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { AirlinesService } from './airlines.service';
import { LookupAirlineDto } from './dto/lookup-airline.dto';
import { ValidationFilter } from './filters/validation.filter';

@WebSocketGateway({ namespace: '/ws/airlines' })
@UseFilters(new ValidationFilter())
@UsePipes(new ValidationPipe({ transform: true }))
export class AirlinesGateway {
    constructor(
        private readonly airlineService: AirlinesService,
        private readonly cacheService: CacheService,
    ) {}

    @SubscribeMessage('lookupAirline')
    async handleLookupAirlineCode(_client: Socket, dto: LookupAirlineDto) {
        const { name: airlineName } = dto;
        const formatedAirlineName = airlineName.toLowerCase();
        const cache = await this.cacheService.getCache(
            `airlines-${formatedAirlineName}`,
        );

        if (cache) {
            return JSON.parse(cache);
        }

        const airlines = await this.airlineService
            .getAirlinesByName(formatedAirlineName)
            .catch((e: unknown) => {
                console.error(e);
                throw new InternalServerErrorException();
            });

        this.cacheService.setCache(
            `airlines-${formatedAirlineName}`,
            JSON.stringify(airlines),
        );

        return airlines;
    }
}
