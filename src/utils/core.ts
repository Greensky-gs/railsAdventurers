import points from '../data/points.json';
import { touch } from '../typings/datas';
import { pointKind, pointType } from '../typings/points';
import touches from '../data/touches.json'

export const getPoints = (): pointType<pointKind>[] => points as pointType<pointKind>[];
export const getCounters = (): pointType<'counter'>[] => getPoints().filter(x => x.type === 'counter') as pointType<'counter'>[]
export const getCities = (): pointType<'city'>[] => getPoints().filter(x => x.type === 'city') as pointType<'city'>[];
export const getCounterPos = (number: number) => {
    const min = 0;
    if (number < min) number = min;
    if (number > 100) number -= (number % 100) * 100;

    const { x, y } = getCounters().find(x => x.number === number) ?? { x: 0, y: 0 };
    return { x, y };
};
export const getPathPos = (pos: [number, number, number, number, number, number, number, number]): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] => {
    const values = [];

    for (let i = 0; i < 4; i++) {
        values.push({
            x: pos[i * 2],
            y: pos[i * 2 + 1]
        })
    }

    return values as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
}
export const getPaths = (): pointType<'rail'>[] => getPoints().filter(x => x.type === 'rail') as pointType<'rail'>[]
export const getTouches = (): touch[] => touches;
