import { Collection } from 'discord.js';
import { Game } from '../structure/Game';

export const games: Collection<number, Game> = new Collection();
