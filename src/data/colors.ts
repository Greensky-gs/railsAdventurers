import { ColorResolvable } from 'discord.js';
import { colorType } from '../typings/datas';
import { playerColor } from '../typings/player';
import { color } from '../typings/points';

const colorsData: Record<color, colorType<color>> = {
    black: {
        color: 'black',
        code: '#746965',
        name: 'noir'
    },
    blue: {
        color: 'blue',
        code: '#86B9CC',
        name: 'bleu'
    },
    green: {
        color: 'green',
        code: '#6D9D53',
        name: 'vert'
    },
    orange: {
        color: 'orange',
        code: '#F3981F',
        name: 'orange'
    },
    pink: {
        color: 'pink',
        code: '#E3A7CB',
        name: 'violet'
    },
    red: {
        color: 'red',
        code: '#C43C21',
        name: 'rouge'
    },
    white: {
        color: 'white',
        code: '#F4F1EF',
        name: 'blanc'
    },
    yellow: {
        color: 'yellow',
        code: '#FEDD65',
        name: 'jaune'
    }
};
const playerColors: Record<playerColor, ColorResolvable> = {
    black: '#1e1a1a',
    white: '#FCFCFC',
    purple: '#BD84B1'
};

export { colorsData, playerColors };
