import { IsBoolean } from 'class-validator';

export class ArchiveClaimDto {
    @IsBoolean()
    archived: boolean;
}
