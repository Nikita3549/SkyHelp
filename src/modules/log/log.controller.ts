import { Body, Controller, Post } from '@nestjs/common';

@Controller('log')
export class LogController {
    @Post()
    log(@Body() dto: any) {
        console.log(dto);
    }
}
