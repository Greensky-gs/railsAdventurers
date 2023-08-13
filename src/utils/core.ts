import points from '../data/points.json';
import { card, cardType, touch } from '../typings/datas';
import { pointKind, pointType } from '../typings/points';
import touches from '../data/touches.json';
import cards from '../data/cards.json';

export const getPoints = (): pointType<pointKind>[] => points as pointType<pointKind>[];
export const getCounters = (): pointType<'counter'>[] =>
    getPoints().filter((x) => x.type === 'counter') as pointType<'counter'>[];
export const getCities = (): pointType<'city'>[] => getPoints().filter((x) => x.type === 'city') as pointType<'city'>[];
export const getCounterPos = (number: number) => {
    const min = 0;
    if (number < min) number = min;
    if (number > 100) number -= (number % 100) * 100;

    const { x, y } = getCounters().find((x) => x.number === number) ?? { x: 0, y: 0 };
    return { x, y };
};
export const getPathPos = (
    pos: [number, number, number, number, number, number, number, number]
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] => {
    const values = [];

    for (let i = 0; i < 4; i++) {
        values.push({
            x: pos[i * 2],
            y: pos[i * 2 + 1]
        });
    }

    return values as [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number }
    ];
};
export const getPaths = (): pointType<'rail'>[] => getPoints().filter((x) => x.type === 'rail') as pointType<'rail'>[];
export const getTouches = (): touch[] => touches;
export const getDestinations = (): card<'destination'>[] => cards.destinations as card<'destination'>[];
export const destinationSentence = (id: number, description = false) => {
    const dest = getDestinations().find(x => x.id === id)
    const find = (idx: number) => getCities().find(x => x.id === idx);

    if (description) return `Reliez ${find(dest.from).name} à ${find(dest.to).name} pour ${dest.points} points`
    return `${find(dest.from).name} → ${find(dest.to).name} ( ${dest.points} points )`
}
export const getPathsFor = (id: number) => {
    const touches = getTouches();
    const paths = getPaths();

    return touches.filter(x => x.from === id || x.to === id).map(x => paths.find(y => y.id === x.by))
}
export const getAllTouchesWith = (id: number) => getTouches().filter(x => x.from === id || x.to === id);
export const touchesToPaths = (touches: touch[]) => getPaths().filter(x => touches.map(y => y.by).includes(x.id))
export const getCitiesTouching = (touches: touch[]) => getCities().filter(x => touches.find(y => y.from === x.id || y.to === x.id));