import { ColorResolvable } from 'discord.js';
import { color } from './points';
import cards from '../data/cards.json';

export type colorType<Color extends color> = {
    color: Color;
    code: ColorResolvable;
};

export type cardType = 'wagon' | 'destination';
export type wagonKey = keyof (typeof cards)['wagons'];

type wagonType<Key extends wagonKey> = {
    key: Key;
    img: string;
};
type id = number;
type destinationType = {
    id: id;
    from: id;
    to: id;
    points: number;
};
type baseCard<Type extends cardType> = {
    type: Type;
};

export type card<Type extends cardType> = baseCard<Type> &
    (Type extends 'wagon' ? wagonType<wagonKey> : Type extends 'destination' ? destinationType : never);
export type touch = {
    from: id;
    to: id;
    by: id;
};
