import { AirlineReason, DisruptionType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class IssueDto {
    @IsEnum(DisruptionType)
    flightIssue: DisruptionType;

    @IsEnum(AirlineReason)
    reasonGivenByAirline: AirlineReason;

    @IsString()
    additionalInformation: string;
}
