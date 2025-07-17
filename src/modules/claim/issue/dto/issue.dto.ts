import { AirlineReason, DisruptionType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class IssueDto {
    @IsString()
    claimId: string;

    @IsEnum(DisruptionType)
    flightIssue: DisruptionType;

    @IsEnum(AirlineReason)
    reasonGivenByAirline: AirlineReason;

    @IsString()
    additionalInformation: string;
}
