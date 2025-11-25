import { Color } from 'pdf-lib';

export interface ICoordinates {
    x: number;
    y: number;
    page: number;
    text: string;
    color: Color;
    size: number;
    fontWeight: 'REGULAR' | 'BOLD';
}
