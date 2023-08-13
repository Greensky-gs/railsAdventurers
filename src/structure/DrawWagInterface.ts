import { ButtonInteraction, InteractionCollector, Message, StringSelectMenuBuilder, StringSelectMenuInteraction, User } from "discord.js";
import { BaseInterface } from "./BaseInterface";
import { Game } from "./Game";
import { button, nameWagon, row } from "../utils/toolbox";
import { wagonKey } from "../typings/datas";
import { drawInterfaceSelection } from "../typings/game";
import { DrawInterfaceStep } from "../typings/core";
import { drawWag } from "../contents/embeds";
import { log4js } from "amethystjs";
import { Ids } from "../data/ids";

export class DrawWagInterface extends BaseInterface {
    private game: Game
    private selection: drawInterfaceSelection
    private step: DrawInterfaceStep = 'idle';

    constructor(game: Game) {
        super()

        this.game = game;
        this.start()
    }

    public async show(interaction: ButtonInteraction): Promise<wagonKey[] | 'cancel'> {
        return new Promise(async(resolve) => {
            this.step = 'shown';
    
            const reply = await interaction.reply({...this.content(interaction.user), fetchReply: true, ephemeral: true}).catch(log4js.trace) as Message<true>;
            if (!reply) return this.step = 'idle';
    
            const collector = reply.createMessageComponentCollector({
                time: 120000
            })
            const selected: wagonKey[] = []
    
            const end = (reason: string, ctx: ButtonInteraction | StringSelectMenuInteraction, resolveValue: wagonKey[] | 'cancel') => {
                ctx.deferUpdate().catch(log4js.trace);
                resolve(resolveValue);
                this.step = 'idle';

                interaction.deleteReply().catch(() => {
                    interaction.editReply({
                        components: []
                    }).catch(log4js.trace)
                });
                collector.stop(reason)
            }
            collector.on('end', (_c, reason) => {
                
                resolve('cancel')
                this.step = 'idle'
                interaction.deleteReply().catch(() => {
                    interaction.editReply({
                        components: []
                    }).catch(log4js.trace)
                })
            })
            collector.on('collect', async(ctx) => {
                if (ctx.isButton()) {
                    if (ctx.customId === Ids.PickCancel) {
                        end('cancel', ctx, 'cancel')
                    }
                    if (ctx.customId === Ids.PickEnd) {
                        end('ended', ctx, selected)
                    }
                    if (ctx.customId === Ids.PickRandom) {
                        const random = this.game.drawWag(false);
                        selected.push(random)
                        
                        if (this.step === 'firstpicked') {
                            end('ended', ctx, selected)
                        } else {
                            ctx.deferUpdate().catch(log4js.trace)
                            this.step = 'firstpicked'

                            interaction.editReply(this.content(interaction.user)).catch(log4js.trace);
                        }
                    }
                }
                if (ctx.isStringSelectMenu()) {
                    const index = parseInt(ctx.values[0])
                    const key: wagonKey = this.selection[index];

                    const replace = this.game.drawWag(false)
                    this.selection.splice(index, 1, replace);
                    selected.push(key);

                    if (this.step === 'firstpicked') {
                        end('ended', ctx, selected)
                    } else {
                        ctx.deferUpdate().catch(log4js.trace)
                        this.step = 'firstpicked';

                        interaction.editReply(this.content(interaction.user)).catch(log4js.trace)
                    }
                }
            });
        })
    }

    private content(user: User) {
        return {
            embeds: [ drawWag(user) ],
            components: this.components
        }
    }
    private get components() {
        return [
            row(
                button({
                    label: 'Aléatoire',
                    style: 'Primary',
                    id: 'PickRandom'
                }),
                button({
                    label: 'Terminer',
                    style: 'Success',
                    id: 'PickEnd',
                    disabled: this.step === 'idle' || this.step === 'shown'
                }),
                button({
                    label: 'Annuler',
                    style: 'Danger',
                    id: 'PickCancel',
                    disabled: this.step !== 'shown'
                }),
                button({
                    label: `${this.step === 'shown' ? '0' : this.step === 'firstpicked' ? '1' : '2'}/2`,
                    style: 'Secondary',
                    disabled: true,
                    custom: 'game.noCustom'
                })
            ),
            row(
                new StringSelectMenuBuilder()
                    .setCustomId(Ids.PickMenu)
                    .setMaxValues(1)
                    .setOptions(
                        this.selection.map((x, i) => ({ label: nameWagon(x), description: `Piochez un${x === 'engine' ? 'e':''} ${nameWagon(x)}`, value: i.toString() }))
                    )
            )
        ]
    }
    private async start() {
        this.selection = new Array(5).fill(null).map(() => this.game.drawWag(false)) as drawInterfaceSelection;
    }
}