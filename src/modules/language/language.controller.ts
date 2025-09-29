import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { LanguageService } from './language.service';
import { GetLanguageDto } from './dto/get-language.dto';
import { INVALID_LANGUAGE } from './constants';

@Controller('languages')
export class LanguageController {
    constructor(private readonly languageService: LanguageService) {}
    @Get(':language')
    async getLanguage(@Param() params: GetLanguageDto) {
        return this.languageService
            .getTranslationsJson(params.language)
            .catch((_e: unknown) => {
                console.error(_e);
                throw new NotFoundException(INVALID_LANGUAGE);
            });
    }
}
