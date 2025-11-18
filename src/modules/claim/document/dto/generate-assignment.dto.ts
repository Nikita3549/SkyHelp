import { IsString } from 'class-validator';

export class GenerateAssignmentDto {
    @IsString()
    passengerId: string;
}
