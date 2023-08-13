import { wagonKey } from '../typings/datas';
import { decks } from '../typings/game';

export class Simulator {
    private decks: decks;
    private base: decks;
    constructor(deck: decks) {
        this.decks = deck;
        this.base = deck;
    }

    public get wagons() {
        return this.decks.wagons;
    }

    public reset() {
        this.decks = this.base;
    }
    public removeWagon(...cards: { key: wagonKey; count: number }[]) {
        cards.forEach((card) => {
            this.decks.wagons[card.key] -= card.count;
            if (this.decks.wagons[card.key] < 0) this.decks.wagons[card.key] = 0;
        });
    }
    public get usable() {
        return Object.keys(this.decks.wagons)
            .filter((x) => this.decks.wagons[x] > 0)
            .map((x: wagonKey) => ({ key: x, count: this.decks.wagons[x] }));
    }
    public maximumEnginesBuild(exclude?: wagonKey) {
        const keys = Object.keys(this.decks.wagons)
            .filter((x) => x !== 'engine')
            .filter((x) => (!!exclude ? x !== exclude : true));

        const count: { key: wagonKey; engines: number }[] = keys
            .map((key: wagonKey) => ({ key, engines: Math.floor(this.decks[key] / 3) }))
            .filter((x) => x.engines > 0);
        return count;
    }
}
