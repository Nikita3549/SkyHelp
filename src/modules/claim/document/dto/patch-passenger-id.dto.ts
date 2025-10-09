import { IsString } from 'class-validator';

export class PatchPassengerIdDto {
    @IsString()
    passengerId: string;

    @IsString()
    documentId: string;
}
