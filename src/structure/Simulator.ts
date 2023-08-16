import { wagonKey } from '../typings/datas';
import { decks } from '../typings/game';

export class Simulator {
    private decks: decks;
    private base: decks;
    constructor(deck: decks) {
        this.decks = JSON.parse(JSON.stringify(deck));
        this.base = deck;
    }

    public get wagons() {
        return this.decks.wagons;
    }

    public reset() {
        this.decks = JSON.parse(JSON.stringify(this.base));
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
        const map = Object.keys(this.wagons)
            .map((k: keyof typeof this.wagons) => ({ key: k, count: this.wagons[k] }))
            .filter((x) => (!!exclude ? x.key !== exclude : true));
        const valid = map.filter((x) => x.count >= 3);

        return valid.map((x) => ({ ...x, count: Math.floor(x.count / 3) }));
    }
}
