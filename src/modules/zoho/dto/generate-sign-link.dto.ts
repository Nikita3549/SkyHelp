import { IsEnum, IsJWT, IsOptional, IsString } from 'class-validator';
import { SignScenarioType } from '@prisma/client';

export class GenerateSignLinkDto {
    @IsOptional()
    @IsJWT()
    jwt?: string;

    @IsOptional()
    @IsString()
    passengerId?: string;

    @IsOptional()
    @IsString()
    customerId?: string;

    @IsString()
    claimId: string;

    @IsEnum(SignScenarioType)
    scenario: SignScenarioType;
}
