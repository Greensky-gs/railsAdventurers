import { colorType } from '../typings/datas';
import { color } from '../typings/points';

const colorsData: Record<color, colorType<color>> = {
    black: {
        color: 'black',
        card: './dist/assets/black.png',
        code: '#746965'
    },
    blue: {
        color: 'blue',
        card: './dist/assets/blue.png',
        code: '#86B9CC'
    },
    green: {
        color: 'green',
        card: './dist/assets/green.png',
        code: '#6D9D53'
    },
    orange: {
        color: 'orange',
        card: './dist/assets/orange.png',
        code: '#F3981F'
    },
    pink: {
        color: 'pink',
        card: './dist/assets/pink.png',
        code: '#E3A7CB'
    },
    red: {
        color: 'red',
        card: './dist/assets/red.png',
        code: '#C43C21'
    },
    white: {
        color: 'white',
        card: './dist/assets/white.png',
        code: '#F4F1EF'
    },
    yellow: {
        color: 'yellow',
        card: './dist/assets/yellow.png',
        code: '#FEDD65'
    }
};

export { colorsData };
