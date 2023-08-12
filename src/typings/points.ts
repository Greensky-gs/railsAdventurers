export type pointKind = 'city' | 'rail' | 'counter';
export type railType = 'tunnel' | 'bridge' | 'regular';
export type color = 'blue' | 'yellow' | 'orange' | 'pink' | 'black' | 'white' | 'red' | 'green';
export type rails = {
    color: color | 'any';
    types: railType;
    requiresEngine: boolean;
    pos: [number, number, number, number, number, number, number, number]
};

type cityType = {
    name: string;
    x: number;
    y: number;
};
type railsType = {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    paths: [rails[], rails[]?];
};
type counterType = {
    number: number;
    x: number;
    y: number;
}
type id = number;
export type basePoint<T extends pointKind> = {
    type: T;
    // id: id;
}
export type pointType<PointType extends pointKind> = 
    basePoint<PointType>
    & (
        PointType extends 'city'
            ? cityType
            : PointType extends 'rail'
            ? railsType
            : PointType extends 'counter'
            ? counterType
            : never
    );
