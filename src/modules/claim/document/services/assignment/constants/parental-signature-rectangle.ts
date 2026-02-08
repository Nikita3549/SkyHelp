import { ISignatureRectangle } from '../interfaces/signature-rectangle.interface';
import { ASSIGNMENT } from './assignment';

export const ParentalSignatureRectangle: ISignatureRectangle = {
    x: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.X,
    y: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.Y,
    width: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.WIDTH,
    height: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.HEIGHT,
    page: ASSIGNMENT.PARENTAL.PAGE_INDEX.SIGNATURE,
} as const;
