import {
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SendBoardingPassData } from './dto/send-boarding-pass-data.dto';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { ValidationFilter } from '../../../filters/validation.filter';
import { AirlineService } from '../../airline/airline.service';
import { AirportService } from '../../airport/airport.service';
import { IBoardingPassData } from './interfaces/boarding-pass-data.interface';

@WebSocketGateway({
    namespace: '/ws/boarding-pass',
    cors: {
        origin: '*',
    },
})
@UseFilters(new ValidationFilter())
@UsePipes(new ValidationPipe({ transform: true }))
export class BoardingPassGateway implements OnGatewayConnection {
    constructor(
        private readonly airlineService: AirlineService,
        private readonly airportService: AirportService,
    ) {}

    @WebSocketServer() server: Server;

    handleConnection(client: Socket) {
        const sessionId = client.handshake.query?.sessionId;
        if (!sessionId || typeof sessionId != 'string') {
            client.emit('exception', 'sessionId is required');
            client.disconnect();
            return;
        }

        client.join(sessionId);
        client.data.sessionId = sessionId;
    }

    @SubscribeMessage('boarding-pass.send')
    async handleMessage(
        client: Socket,
        @MessageBody() payload: SendBoardingPassData,
    ) {
        const {
            airlineIata,
            arrivalAirportIata,
            departureAirportIata,
            sessionId,
        } = payload;

        const arrivalAirport =
            await this.airportService.getAirportByIata(arrivalAirportIata);
        const departureAirport =
            await this.airportService.getAirportByIata(departureAirportIata);
        const airline = await this.airlineService.getAirlineByIata(airlineIata);

        if (!arrivalAirport || !departureAirport) {
            throw new WsException('Invalid departure or arrival airport IATA');
        }

        if (!airline) {
            throw new WsException('Invalid airline IATA');
        }

        const boardingPassData: IBoardingPassData = {
            ...payload,
            airline,
            arrivalAirport,
            departureAirport,
        };
        this.server.to(sessionId).emit('boarding-pass.data', boardingPassData);

        return boardingPassData;
    }
}
