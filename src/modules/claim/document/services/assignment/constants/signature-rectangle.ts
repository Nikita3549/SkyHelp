import { ISignatureRectangle } from '../interfaces/signature-rectangle.interface';
import { ASSIGNMENT } from './assignment';

export const SignatureRectangle: ISignatureRectangle = {
    x: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.X,
    y: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.Y,
    width: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.WIDTH,
    height: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.HEIGHT,
    page: ASSIGNMENT.REGULAR.PAGE_INDEX.SIGNATURE,
};
