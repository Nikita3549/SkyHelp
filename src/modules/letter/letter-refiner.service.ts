import { Injectable } from '@nestjs/common';
import { RefineEmailBodyDto } from './dto/refine-email-body.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LetterRefinerService {
    constructor(private readonly configService: ConfigService) {}

    async refineEmailBody(dto: RefineEmailBodyDto): Promise<string | null> {
        try {
            const { data } = await axios.post<{
                processed_text: string;
            }>(
                `${this.configService.getOrThrow('SKYHELP_AI_API')}/api/v1/rewrite-email`,
                {
                    text: dto.body,
                    target_language: dto.targetLanguage,
                },
            );

            if (!data?.processed_text) {
                console.error('Failed to refine email \n', data);
                return null;
            }

            return data.processed_text;
        } catch (e) {
            console.error('Failed to refine email \n', e);
            return null;
        }
    }
}
