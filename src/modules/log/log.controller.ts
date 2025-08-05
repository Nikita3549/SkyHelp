import { Body, Controller, Post } from '@nestjs/common';

@Controller('log')
export class LogController {
    @Post()
    async log(@Body() dto: any) {
        console.log(dto);
    }
}
