import { colorType } from '../typings/datas';
import { color } from '../typings/points';

const colorsData: Record<color, colorType<color>> = {
    black: {
        color: 'black',
        code: '#746965'
    },
    blue: {
        color: 'blue',
        code: '#86B9CC'
    },
    green: {
        color: 'green',
        code: '#6D9D53'
    },
    orange: {
        color: 'orange',
        code: '#F3981F'
    },
    pink: {
        color: 'pink',
        code: '#E3A7CB'
    },
    red: {
        color: 'red',
        code: '#C43C21'
    },
    white: {
        color: 'white',
        code: '#F4F1EF'
    },
    yellow: {
        color: 'yellow',
        code: '#FEDD65'
    }
};

export { colorsData };
