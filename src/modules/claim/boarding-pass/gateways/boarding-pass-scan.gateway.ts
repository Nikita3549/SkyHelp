import {
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import WebSocket, { WebSocket as RawWebSocket } from 'ws';
import { BoardingPassService } from '../boarding-pass.service';
import { OnModuleInit } from '@nestjs/common';
import { IBoardingPassApiScanResponse } from '../interfaces/boarding-pass-api-scan.response';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
    namespace: '/ws/boarding-pass/scan',
    cors: {
        origin: '*',
    },
})
export class BoardingPassScanGateway implements OnModuleInit {
    @WebSocketServer() server: Server;
    scanLiveClient: RawWebSocket;

    constructor(
        private readonly boardingPassService: BoardingPassService,
        private readonly configService: ConfigService,
    ) {}

    onModuleInit() {
        this.scanLiveClient = new RawWebSocket(
            `${this.configService.getOrThrow('BOARDING_PASS_API_URL')}/ws/scan-stream`,
        );

        this.scanLiveClient.onmessage = async (
            event: WebSocket.Event & { data: any },
        ) => {
            const response = JSON.parse(
                event.data,
            ) as IBoardingPassApiScanResponse;

            if (response.status != 'success') {
                return;
            }
            const boardingPassData =
                await this.boardingPassService.parseBoardingPassResponseData(
                    response.data,
                );

            this.server
                .to(response.clientId)
                .emit('boarding-pass.data', boardingPassData);
        };
    }

    @SubscribeMessage('boarding-pass.send')
    async boardingPassSendFrame(
        client: Socket,
        @MessageBody() payload: { image: string },
    ) {
        if (!payload.image || typeof payload.image !== 'string') {
            throw new WsException('Field "image" must be a base64 string');
        }

        const base64Data = payload.image.includes(';base64,')
            ? payload.image.split(';base64,').pop()
            : payload.image;

        if (this.scanLiveClient.readyState !== RawWebSocket.OPEN) {
            console.warn('External scan service is not ready');
            return;
        }

        this.scanLiveClient.send(
            JSON.stringify({
                clientId: client.id,
                image: base64Data,
            }),
        );
    }
}
