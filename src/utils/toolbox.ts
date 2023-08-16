import {
    ActionRowBuilder,
    AnyComponentBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Message,
    User
} from 'discord.js';
import { Ids } from '../data/ids';
import { wagonKey } from '../typings/datas';
import { colorsData } from '../data/colors';
import { deckPart } from '../typings/game';
import { log4js } from 'amethystjs';
import { games } from '../cache/games';
import { matchmakings } from '../cache/matchmakings';

export const random = ({ max = 100, min = 0 }: { max?: number; min?: number }) =>
    Math.floor(Math.random() * max - min) + min;
export const shuffleArray = <T>(arr: T[]): T[] =>
    arr
        .map((value) => [Math.random(), value] as any[])
        .sort(([a], [b]) => a - b)
        .map((entry) => entry[1]);
export const button = ({
    style,
    label,
    id,
    url,
    disabled,
    emoji,
    custom
}: {
    label?: string;
    style: keyof typeof ButtonStyle;
    id?: keyof typeof Ids;
    custom?: string;
    url?: string;
    disabled?: boolean;
    emoji?: string;
}) => {
    const btn = new ButtonBuilder().setStyle(ButtonStyle[style]);

    if (id) btn.setCustomId(Ids[id]);
    if (label) btn.setLabel(label);
    if (url) btn.setURL(url);
    if (disabled != undefined) btn.setDisabled(disabled);
    if (emoji) btn.setEmoji(emoji);
    if (custom) btn.setCustomId(custom);

    return btn;
};
export const row = <T extends AnyComponentBuilder>(...components: T[]): ActionRowBuilder<T> =>
    new ActionRowBuilder<T>().setComponents(components);
export const resize = (str: string, length = 100) => {
    if (str.length <= length) return str;
    return str.slice(0, length - 3) + '...';
};
export const capitalize = (str: string) => (!!str ? str[0].toUpperCase() + str.slice(1) : null);
export const sentencePack = (way: deckPart) =>
    Object.keys(way)
        .map((x: wagonKey) => ({ key: x, count: way[x] }))
        .map((x) =>
            x.key === 'engine'
                ? `${x.count} locomotive${x.count === 1 ? '' : 's'}`
                : `${x.count} wagon${x.count === 1 ? '' : 's'} ${colorsData[x.key]?.name}`
        )
        .join(', ');
export const setDeleteTimer = (resolvable: Message<true> | ButtonInteraction, delay = 10000) => {
    setTimeout(() => {
        (resolvable instanceof Message ? resolvable.delete() : resolvable.deleteReply()).catch(log4js.trace);
    }, delay);
};
export const nameWagon = (key: wagonKey) => (key === 'engine' ? 'locomotive' : `wagon ${colorsData[key].name}`);
export const plurial = (int: number | any[]) => ((typeof int === 'number' ? int : int.length) === 1 ? '' : 's');
export const isPlaying = (resolvable: User | string) =>
    !!games.find((x) => x.players.find((y) => y.user.id === (resolvable instanceof User ? resolvable.id : resolvable)));
export const matchmaked = (user: User) => matchmakings.includes(user.id);
