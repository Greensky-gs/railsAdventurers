import { ColorResolvable } from 'discord.js';
import { color } from './points';

export type colorType<Color extends color> = {
    color: Color;
    card: `./dist/assets/${Color}.png`;
    code: ColorResolvable;
};
