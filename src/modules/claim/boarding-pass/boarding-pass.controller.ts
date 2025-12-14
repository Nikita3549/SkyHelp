import { Controller, Post, UploadedFiles } from '@nestjs/common';
import { BoardingPassUploadMultiInterceptor } from '../../../common/interceptors/boarding-pass/boarding-pass-upload.interceptor';
import { BoardingPassService } from './boarding-pass.service';
import { IBoardingPassData } from './interfaces/boarding-pass-data.interface';

@Controller('claims/boarding-pass')
export class BoardingPassController {
    constructor(private readonly boardingPassService: BoardingPassService) {}

    @Post()
    @BoardingPassUploadMultiInterceptor()
    async boardingPass(
        @UploadedFiles() files: Express.Multer.File[],
    ): Promise<IBoardingPassData> {
        return this.boardingPassService.parseBoardingPass(files);
    }
}
