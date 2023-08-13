import { createCanvas, loadImage, CanvasRenderingContext2D, Canvas } from "canvas";
import { Game } from "./Game";
import { log4js } from "amethystjs";
import { getCounterPos, getPathPos, getPaths } from "../utils/core";
import { Player } from "./Player";

export class Generator {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }

    // Method
    public async generate() {
        const canvas = createCanvas(this.dimens.width, this.dimens.height);
        const context = canvas.getContext('2d');

        const plate = await loadImage('./assets/plate.png').catch(log4js.trace);
        if (!plate) return;

        context.drawImage(plate, 0, 0);

        this.placeCounters(context)
        this.placePlaced(context)

            return this.redimentionate(canvas);
    }
    // Core
    private redimentionate(canvas: Canvas) {
        const ratio = canvas.width / canvas.height;
        const width = 850;
        const height = width / ratio;

        const bigger = createCanvas(width, height);
        const ctx = bigger.getContext('2d')

        ctx.drawImage(canvas, 0, 0, width, height);
        return bigger
    }
    private placeCounters(context: CanvasRenderingContext2D) {
        const arrs: Player[][] = [];
        this.game.players.forEach((player) => {
            if (!arrs.find(x => x.find(y => y.points === player.points))) {
                arrs.push([player]);
            } else {
                arrs.find(x => x.find(y => y.points === player.points)).push(player)
            }
        })

        arrs.forEach((arr) => {
            if (arr.length === 1) {
                const pos = getCounterPos(arr[0].points);

                context.beginPath();
                context.arc(pos.x, pos.y, this.dimens.pointsRadius, 0, 2 * Math.PI);
                context.fillStyle = arr[0].color;
                context.fill();
            } else if (arr.length === 2) {
                const pos = getCounterPos(arr[0].points);
                const edited = [{ x: pos.x - 2, y: pos.y - 2 }, { x: pos.x + 2, y: pos.y + 2 }]

                arr.forEach((pl, i) => {
                    context.beginPath();
                    const vals = edited[i];

                    context.arc(vals.x, vals.y, this.dimens.pointsRadius, 0, 2 * Math.PI);
                    context.fillStyle = pl.color;
                    context.fill();
                })
            } else {
                const pos = getCounterPos(arr[0].points);
                const edited = [{ x: pos.x - 2, y: pos.y - 2 }, { x: pos.x + 2, y: pos.y - 2 }, { x: pos.x, y: pos.y - 2 }]

                arr.forEach((pl, i) => {
                    context.beginPath();
                    const vals = edited[i];

                    context.arc(vals.x, vals.y, this.dimens.pointsRadius, 0, 2 * Math.PI);
                    context.fillStyle = pl.color;
                    context.fill();
                })
            }
        })
    }
    private placePlaced(context: CanvasRenderingContext2D) {
        if (!this.game.placed.length) return;

        this.game.placed.forEach((placed) => {
            const color = this.game.players[placed.player].color;
            const rail = getPaths().find(x => x.id === placed.rail);
            const path = rail.paths[placed.pathIndex]

            path.forEach((path) => {
            	const pos = getPathPos(path.pos);
        
            	context.beginPath();
                
            	pos.forEach((p, i) => {
            		if (i === 0) context.moveTo(p.x, p.y);
            		else context.lineTo(p.x, p.y);
            	})
            	context.closePath()
            	context.fillStyle = color;
            	context.fill();
            })
        })
    }
    private get dimens() {
        return {
            width: 712,
            height: 477,
            pointsRadius: 4
        }
    }
}