import { TextChannel, User } from 'discord.js';
import { card, cardType, wagonKey } from './datas';
import { playerColor } from './player';
import { Player } from '../structure/Player';

type id = number;
export type gameOptions = {
    channel: TextChannel;
    users: [User, User, User?];
    colors: [playerColor, playerColor, playerColor?];
};
export type decks = {
    destinations: id[];
    wagons: Record<wagonKey, number>;
};
export type placed = {
    player: number;
    rail: id;
    pathIndex: 0 | 1;
};
export type deckPart = {
    [key in wagonKey]?: number;
};
export type drawInterfaceSelection = [wagonKey, wagonKey, wagonKey, wagonKey, wagonKey];
