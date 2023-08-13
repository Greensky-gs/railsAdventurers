import { User } from 'discord.js';
import { Game } from './Game';
import { playerColor, playerState } from '../typings/player';
import { decks } from '../typings/game';
import { wagonKey } from '../typings/datas';
import { Simulator } from './Simulator';
import { getDestinations, getPaths, getTouches } from '../utils/core';

export class Player {
    private _user: User;
    private _index: number;
    private game: Game;
    private _color: playerColor;
    private _points: number = 0;
    private decks: decks = {
        destinations: [],
        wagons: {
            black: 0,
            blue: 0,
            red: 0,
            yellow: 0,
            orange: 0,
            green: 0,
            pink: 0,
            white: 0,
            engine: 0
        }
    };
    private finishedDestinations: number[] = [];
    private _state: playerState = 'idle';
    private _wagons: number = 40;

    constructor({ user, index, game, color }: { user: User; index: number; game: Game; color: playerColor }) {
        this._user = user;
        this._index = index;
        this.game = game;
        this._color = color;
    }

    // Props
    public get points() {
        return this._points;
    }
    public get color() {
        return this._color;
    }
    public get user() {
        return this._user;
    }
    public get destinations() {
        return this.decks.destinations;
    }
    public get finishedDestinationList() {
        return this.finishedDestinations;
    }
    public get state() {
        return this._state;
    }
    public get simulator() {
        return new Simulator(this.decks);
    }
    public get wagons() {
        return this._wagons;
    }
    public get wagonsCard() {
        return this.decks.wagons;
    }
    public get index() {
        return this._index;
    }

    // On end
    private connectionTable() {
        const table: number[][] = [];
        this.game.placed
            .filter((x) => x.player === this._index)
            .forEach((placed) => {
                const ids = getTouches().find((y) => y.by === getPaths().find((x) => x.id === placed.rail).id);
                const countainsOne = table.find((x) => x.includes(ids.from) || x.includes(ids.to));

                if (countainsOne) {
                    if (!countainsOne.includes(ids.from)) countainsOne.push(ids.from);
                    if (!countainsOne.includes(ids.to)) countainsOne.push(ids.to);
                } else {
                    table.push([ids.from, ids.to]);
                }
            });

        return table;
    }
    public calculateEndPoints() {
        const table = this.connectionTable();
        let done = 0;

        this.destinations.forEach((dest) => {
            const destination = getDestinations().find((x) => x.id === dest);
            const connection = table.find((x) => x.includes(destination.from));

            if (!connection) {
                this.removePoints(destination.points);
                return;
            }
            if (!connection.includes(destination.to)) {
                this.removePoints(destination.points);
                return;
            }
            this.addPoints(destination.points);
            done++;
        });

        return {
            done,
            table,
            player: this,
            gtBonus: false
        };
    }

    // Game
    public setState(state: playerState) {
        this._state = state;
    }
    public addDestinations(...id: number[]) {
        this.decks.destinations.push(...id);
        this.decks.destinations = [...new Set(this.decks.destinations)];
    }
    public keepOnlyThese(id: number[]) {
        const current = this.decks.destinations;
        this.decks.destinations = id;

        const removed = current.filter((x) => !id.includes(x));
        this.removeDestination(...removed);
        return removed;
    }
    public removeDestination(...ids: number[]) {
        this.decks.destinations = this.decks.destinations.filter((x) => !ids.includes(x));

        return ids;
    }
    public addWagon(...cards: wagonKey[]) {
        cards.forEach((card) => {
            this.decks.wagons[card]++;
        });
    }
    public removeWagon(...cards: { key: wagonKey; count: number }[]) {
        cards.forEach((card) => {
            this.decks.wagons[card.key] -= card.count;
            if (this.decks.wagons[card.key] < 0) this.decks.wagons[card.key] = 0;
        });
    }
    public removeWagons(count: number) {
        this._wagons -= count;
        if (this._wagons <= 2) return 'last round';
        return 'continue';
    }
    public addRails(length: number) {
        const map: Record<number, number> = {
            1: 1,
            2: 2,
            3: 4,
            4: 7,
            5: 10,
            6: 15,
            9: 27
        };

        this.addPoints(map[length]);
    }
    public hasGt() {
        this.addPoints(10);
    }

    // Core
    public addPoints(count: number) {
        this._points += count;
    }
    private removePoints(count: number) {
        this._points -= count;
    }
}
