import { createCanvas, loadImage, CanvasRenderingContext2D, Canvas, Image } from 'canvas';
import { Game } from './Game';
import { log4js } from 'amethystjs';
import { getCounterPos, getPathPos, getPaths } from '../utils/core';
import { Player } from './Player';
import { BufferResolvable } from 'discord.js';

export class Generator {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }

    // Method
    public async generate() {
        const canvas = createCanvas(this.dimens.width, this.dimens.height);
        const context = canvas.getContext('2d');

        const plate = await loadImage('./assets/plate.jpg').catch(log4js.trace);
        if (!plate) return;

        context.drawImage(plate, 0, 0);

        this.placeCounters(context);
        this.placePlaced(context);

        // return this.redimentionate(canvas);
        return canvas;
    }
    public async generateEnd(users: { done: number; player: Player; gtBonus: boolean }[]): Promise<BufferResolvable> {
        return new Promise(async (resolve) => {
            const canvas = createCanvas(512, 512);
            const ctx = canvas.getContext('2d');

            const infoColor = '#231e60';

            const backGround = await loadImage('./assets/background/' + Math.floor(Math.random() * 4) + '.png');
            ctx.drawImage(backGround, 0, 0);
            const cY = (i: number) => 40 * (i + 1) + 90 * i;

            let done = 0;
            const drawUserRanking = async (
                x: number,
                y: number,
                points: number,
                profileImage: Image,
                username: string,
                i: number,
                gtBonus: boolean
            ) => {
                ctx.fillStyle = infoColor;
                ctx.roundRect(x, y, canvas.width - 2 * x, 90, 10);
                ctx.fill();

                // Draw points
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Arial';
                ctx.fillText(points.toString(), x + 100, y + 70);

                // Draw rounded profile image
                const imageX = x + 20;
                const imageY = y + 10;
                const imageSize = 70;
                const imageRadius = 10;

                ctx.save();
                ctx.roundRect(imageX, imageY, imageSize, imageSize, imageRadius);
                ctx.clip();
                ctx.drawImage(profileImage, imageX, imageY, imageSize, imageSize);
                ctx.restore();

                // Draw username
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px Arial';
                ctx.fillText(username, x + 100, y + 35);

                // Draw position
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 60px Arial';
                ctx.fillText((i + 1).toString(), x + 420, y + 65);

                // Draw bonus
                if (gtBonus) {
                    const img = await loadImage('./assets/gt.jpg');
                    const ratio = img.width / img.height;

                    const width = 20;
                    const height = width / ratio;

                    ctx.drawImage(img, x + 150, y + 45, width, height)
                }

                done++;
                if (done === users.length) {
                    resolve(canvas.toBuffer());
                }
            };

            // Extend CanvasRenderingContext2D to draw rounded rectangles
            CanvasRenderingContext2D.prototype.roundRect = function (
                x: number,
                y: number,
                width: number,
                height: number,
                radius: number
            ) {
                this.beginPath();
                this.moveTo(x + radius, y);
                this.lineTo(x + width - radius, y);
                this.quadraticCurveTo(x + width, y, x + width, y + radius);
                this.lineTo(x + width, y + height - radius);
                this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                this.lineTo(x + radius, y + height);
                this.quadraticCurveTo(x, y + height, x, y + height - radius);
                this.lineTo(x, y + radius);
                this.quadraticCurveTo(x, y, x + radius, y);
                this.closePath();
                return this;
            };

            const promisify = ({ player, gtBonus }: { player: Player; gtBonus: boolean }, i: number) => {
                return new Promise(async (resolve) => {
                    const img = await loadImage(player.user.displayAvatarURL({ forceStatic: true, extension: 'png' }));
                    await drawUserRanking(10, cY(i), player.points, img, player.user.username, i, gtBonus);

                    resolve('ok');
                });
            };

            const promises = users.map((x, i) => promisify(x, i));
            await Promise.all([promises]);
        });
    }
    // Core
    private redimentionate(canvas: Canvas) {
        const ratio = canvas.width / canvas.height;
        const width = 850;
        const height = width / ratio;

        const bigger = createCanvas(width, height);
        const ctx = bigger.getContext('2d');

        ctx.drawImage(canvas, 0, 0, width, height);
        return bigger;
    }
    private placeCounters(context: CanvasRenderingContext2D) {
        const arrs: Player[][] = [];
        this.game.players.forEach((player) => {
            if (!arrs.find((x) => x.find((y) => y.points === player.points))) {
                arrs.push([player]);
            } else {
                arrs.find((x) => x.find((y) => y.points === player.points)).push(player);
            }
        });

        arrs.forEach((arr) => {
            if (arr.length === 1) {
                const pos = getCounterPos(arr[0].points);

                context.beginPath();
                context.arc(pos.x, pos.y, this.dimens.pointsRadius, 0, 2 * Math.PI);
                context.fillStyle = arr[0].color;
                context.fill();
            } else if (arr.length === 2) {
                const pos = getCounterPos(arr[0].points);
                const edited = [
                    { x: pos.x - 2, y: pos.y - 2 },
                    { x: pos.x + 2, y: pos.y + 2 }
                ];

                arr.forEach((pl, i) => {
                    context.beginPath();
                    const vals = edited[i];

                    context.arc(vals.x, vals.y, this.dimens.pointsRadius, 0, 2 * Math.PI);
                    context.fillStyle = pl.color;
                    context.fill();
                });
            } else {
                const pos = getCounterPos(arr[0].points);
                const edited = [
                    { x: pos.x - 2, y: pos.y - 2 },
                    { x: pos.x + 2, y: pos.y - 2 },
                    { x: pos.x, y: pos.y - 2 }
                ];

                arr.forEach((pl, i) => {
                    context.beginPath();
                    const vals = edited[i];

                    context.arc(vals.x, vals.y, this.dimens.pointsRadius, 0, 2 * Math.PI);
                    context.fillStyle = pl.color;
                    context.fill();
                });
            }
        });
    }
    private placePlaced(context: CanvasRenderingContext2D) {
        if (!this.game.placed.length) return;

        this.game.placed.forEach((placed) => {
            const color = this.game.players[placed.player].color;
            const rail = getPaths().find((x) => x.id === placed.rail);
            const path = rail.paths[placed.pathIndex];

            path.forEach((path) => {
                const pos = getPathPos(path.pos);

                context.beginPath();

                pos.forEach((p, i) => {
                    if (i === 0) context.moveTo(p.x, p.y);
                    else context.lineTo(p.x, p.y);
                });
                context.closePath();
                context.fillStyle = color;
                context.fill();
            });
        });
    }
    private get dimens() {
        return {
            width: 712,
            height: 477,
            pointsRadius: 4
        };
    }
}
