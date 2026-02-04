import { Injectable } from '@nestjs/common';
import { RefineEmailBodyDto } from './dto/refine-email-body.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ClaimStatus, Email } from '@prisma/client';
import { Languages } from '../language/enums/languages.enums';

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

    async suggestReply(suggestData: {
        emails: Email[];
        claimStatus: ClaimStatus;
        targetLanguage: Languages;
    }): Promise<string | null> {
        try {
            const { data } = await axios.post<{
                processed_text: string;
            }>(
                `${this.configService.getOrThrow('SKYHELP_AI_API')}/api/v1/suggest-reply`,
                {
                    history: suggestData.emails
                        .map(
                            (e) =>
                                `${e.fromEmail}-${e.bodyPlain || e.bodyHtml}`,
                        )
                        .join(),
                    claim_status: suggestData.claimStatus,
                    target_language: suggestData.targetLanguage,
                },
            );

            if (!data?.processed_text) {
                console.error('Failed to suggest reply \n', data);
                return null;
            }

            return data.processed_text;
        } catch (e) {
            console.error(
                'Failed to suggest reply \n',
                JSON.stringify(e, null, 2),
            );
            return null;
        }
    }
}
