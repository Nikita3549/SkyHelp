import { IsBoolean } from 'class-validator';

export class PatchFavoriteLetter {
    @IsBoolean()
    favorite: boolean;
}
