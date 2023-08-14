import {
    AttachmentBuilder,
    ButtonInteraction,
    CollectedInteraction,
    ComponentType,
    Interaction,
    InteractionCollector,
    Message,
    MessageCreateOptions,
    MessageEditOptions,
    RepliableInteraction,
    StringSelectMenuBuilder,
    TextChannel,
    User
} from 'discord.js';
import { deckPart, decks, gameOptions, placed } from '../typings/game';
import {
    destinationSentence,
    getAllTouchesWith,
    getCities,
    getCitiesTouching,
    getDestinations,
    getPaths,
    getPathsFor,
    getTouches
} from '../utils/core';
import {
    button,
    capitalize,
    plurial,
    random,
    resize,
    row,
    sentencePack,
    setDeleteTimer,
    shuffleArray
} from '../utils/toolbox';
import { playerColor } from '../typings/player';
import { Player } from './Player';
import { Generator } from './Generator';
import { log4js, waitForInteraction } from 'amethystjs';
import { alreadyPlayingInGame, inventory, notParticipating, notYourTurn } from '../contents/embeds';
import { cardType, wagonKey } from '../typings/datas';
import { Ids } from '../data/ids';
import { pointType, rails } from '../typings/points';
import { colorsData } from '../data/colors';
import { DrawWagInterface } from './DrawWagInterface';
import { games } from '../cache/games';

export class Game {
    private message: Message<true>;
    private channel: TextChannel;
    private users: [User, User, User?];
    private colors: [playerColor, playerColor, playerColor?];
    private index = 0;
    private decks: decks = {
        destinations: getDestinations().map((x) => x.id),
        wagons: this.defaultDecks.enabled
    };
    private defalsed: decks = {
        destinations: [],
        wagons: this.defaultDecks.defalsed
    };
    private _placed: placed[] = [];
    private _players: Player[] = [];
    private generator: Generator = new Generator(this);
    private collector: InteractionCollector<ButtonInteraction>;
    private started: boolean = false;
    private turnsRemaining = -1;
    private collectors: InteractionCollector<CollectedInteraction>[] = [];
    private drawWagInterface = new DrawWagInterface(this);

    constructor(options: gameOptions) {
        this.users = options.users;
        this.channel = options.channel;
        this.colors = options.colors;

        this.start();
    }

    // Props
    public get players() {
        return this._players;
    }
    public get placed() {
        return this._placed;
    }

    // Engine
    private wagonPic(wagon: wagonKey) {
        return new AttachmentBuilder(`./assets/cards/wagons/${wagon}.jpg`, { name: `${wagon}.jpg` });
    }
    private getPlayer(resolvable: Interaction | User) {
        return this._players.find(
            (x) => x.user.id === (resolvable instanceof User ? resolvable.id : resolvable.user.id)
        );
    }
    private async getWayToPlace(
        player: Player,
        path: rails[],
        interaction: ButtonInteraction | Message<true>,
        reply: Message<true>,
        simulator = player.simulator,
        tunnels = false
    ): Promise<deckPart> {
        const requiredEngines = path[0].types === 'bridge' ? path.filter((x) => x.requiresEngine).length : 0;
        const withoutEngines = path.length - requiredEngines;
        const color = path[0].color;

        let choice: { key: wagonKey; count: number }[] = [];
        const choose = async () => {
            const index = choice.length;
            const rail = path[index];

            const options = () => {
                const opts: { key: wagonKey; count: number }[] = [];
                if (rail.requiresEngine) {
                    if (simulator.usable.find((x) => x.key === 'engine')) {
                        opts.push({ key: 'engine', count: 1 });
                    }
                    const buildable = simulator.maximumEnginesBuild(color === 'any' ? undefined : color);
                    buildable.forEach((x) => {
                        opts.push({
                            key: x.key,
                            count: 3
                        });
                    });
                } else {
                    if (color === 'any') {
                        simulator.usable.forEach((usable) => {
                            opts.push({
                                key: usable.key,
                                count: 1
                            });
                        });
                    } else {
                        if (simulator.usable.find((x) => x.key === color)) {
                            opts.push({ key: color, count: 1 });
                        }
                    }
                    if (simulator.wagons.engine > 0) {
                        opts.push({ key: 'engine', count: 1 });
                    }
                    const buildable = simulator.maximumEnginesBuild(color === 'any' ? undefined : color);
                    buildable.forEach((x) => {
                        opts.push({
                            key: x.key,
                            count: 3
                        });
                    });
                }
                return opts;
            };
            if (options().length === 0) return 'restart';
            const rowBuilder = () => {
                const opts = options();

                return row(
                    new StringSelectMenuBuilder()
                        .setCustomId('game.select.path')
                        .setMaxValues(1)
                        .setOptions(
                            opts.map((opt) => ({
                                label: `${opt.key === 'engine' || opt.count === 3 ? 'Locomotive' : 'Wagon'}`,
                                value: `${opt.key}.${opt.count}`,
                                description: `Utilisez ${opt.count} ${
                                    opt.key === 'engine'
                                        ? 'locomotive'
                                        : `wagon${opt.count === 1 ? '' : 's'} ${colorsData[opt.key]?.name}`
                                }`
                            }))
                        )
                );
            };
            await interaction[interaction instanceof Message ? 'edit' : 'editReply']({
                content: tunnels
                    ? `Quelle carte voulez-vous utiliser pour la ${index + 1}e locomotive supplémentaire ?`
                    : `Quelle carte voulez-vous utiliser pour le ${index + 1}e rail ?`,
                components: [rowBuilder()]
            }).catch(log4js.trace);

            const rep = await waitForInteraction({
                componentType: ComponentType.StringSelect,
                user: player.user,
                message: reply
            }).catch(log4js.trace);
            if (!rep) return;

            const datas = rep.values[0].split('.');
            if (choice.find((x) => x.key === datas[0]))
                choice.find((x) => x.key === datas[0]).count += parseInt(datas[1]);
            else choice.push({ key: datas[0] as wagonKey, count: parseInt(datas[1]) });

            simulator.removeWagon({
                key: datas[0] as wagonKey,
                count: parseInt(datas[1])
            });

            rep.deferUpdate().catch(log4js.trace);
            return true;
        };

        let stopped = false;
        for (let i = 0; i < path.length; i++) {
            const res = await choose().catch(log4js.trace);
            if (res === 'restart') {
                simulator.reset();
                choice = [];
            }
            if (!res) {
                stopped = true;
                break;
            }
        }
        if (stopped) return;

        return choice.reduce((acc, { key, count }) => ({ ...acc, [key]: count }), {});
    }

    // Reply
    private showInventory(interaction: ButtonInteraction) {
        const player = this.getPlayer(interaction);

        interaction
            .reply({
                embeds: [inventory(player)],
                ephemeral: true,
                components: [row(button({ emoji: '🔁', style: 'Primary', id: 'RefreshInventory' }))]
            })
            .catch(log4js.trace);
    }
    private async drawDests(interaction: ButtonInteraction) {
        const player = this.getPlayer(interaction);
        player.setState('playing');

        const reply = (await interaction
            .deferReply({
                ephemeral: true,
                fetchReply: true
            })
            .catch(log4js.trace)) as Message<true>;
        if (!reply) return;
        if (this.decks.destinations.length < 3) {
            await interaction
                .editReply({
                    content: `Il ne reste que **${this.decks.destinations.length}** destination${plurial(
                        this.decks.destinations
                    )}, voulez-vous quand même faire une pioche, en sachant que vous devez en accepter au moins une ?`,
                    components: [
                        row(
                            button({
                                label: 'Oui',
                                style: 'Success',
                                id: 'Yes'
                            }),
                            button({
                                label: 'Non',
                                style: 'Danger',
                                id: 'No'
                            })
                        )
                    ]
                })
                .catch(log4js.trace);

            const rep = await waitForInteraction({
                componentType: ComponentType.Button,
                message: reply,
                user: interaction.user
            }).catch(log4js.trace);

            interaction.deleteReply().catch(() => {
                interaction
                    .editReply({
                        content: 'Annulé',
                        components: []
                    })
                    .catch(() => {
                        if (rep) rep.deferUpdate().catch(log4js.trace);
                    });
            });
            if (!rep || rep.customId === Ids.No) return;
            await rep.deferUpdate().catch(log4js.trace);
        }

        const drawed = new Array(3)
            .fill(null)
            .map(() => this.drawDest())
            .filter((x) => !!x);
        if (drawed.length === 1) {
            player.addDestinations(...drawed);
            this.defalsed.destinations = this.defalsed.destinations.filter((x) => x !== drawed[0]);
            interaction
                .editReply({
                    components: [],
                    content: `Vous avez récupéré la destination **${destinationSentence(drawed[0])}**`
                })
                .catch(log4js.trace);
            return true;
        }

        await interaction
            .editReply({
                content: `Veuillez choisir au moins **une** destination\nVous avez **3 minutes** pour vous décider, si vous ne répondez pas, une destination aléatoire vous sera attribuée`,
                components: [
                    row(
                        new StringSelectMenuBuilder()
                            .setCustomId(Ids.PickDestinationsSelector)
                            .setMinValues(1)
                            .setMaxValues(drawed.length)
                            .setOptions(
                                drawed.map((x) => ({
                                    label: destinationSentence(x),
                                    description: destinationSentence(x, true),
                                    value: x.toString()
                                }))
                            )
                    )
                ]
            })
            .catch(log4js.trace);
        const rep = await waitForInteraction({
            componentType: ComponentType.StringSelect,
            user: interaction.user,
            message: reply,
            time: 180000
        }).catch(log4js.trace);

        const ids = rep ? rep.values.map((x) => parseInt(x)) : [drawed[random({ max: drawed.length })]];
        player.addDestinations(...ids);

        this.defalsed.destinations = this.defalsed.destinations.filter((x) => !ids.includes(x));

        interaction
            .editReply({
                content: `Vous avez pioché ${ids.length === 1 ? `une destination` : `des destinations`} :\n${ids
                    .map((x) => `- ${destinationSentence(x)}`)
                    .join('\n')}`,
                components: []
            })
            .catch(log4js.trace);
        return true;
    }

    // Collection
    private get current() {
        return this._players[this.index % this._players.length];
    }
    private check(interaction: RepliableInteraction) {
        if (!this.users.find((x) => x.id === interaction.user.id)) {
            interaction
                .reply({
                    ephemeral: true,
                    embeds: [notParticipating(interaction.user)]
                })
                .catch(log4js.trace);
            return false;
        }
        const inventory = (interaction as { customId: string }).customId !== Ids.Inventory;
        if (this.started && this.current.user.id !== interaction.user.id && inventory) {
            interaction
                .reply({
                    ephemeral: true,
                    embeds: [notYourTurn(interaction.user)]
                })
                .catch(log4js.trace);
            return false;
        }
        if (this._players.find((x) => x.user.id === interaction.user.id).state === 'playing' && inventory) {
            interaction
                .reply({
                    embeds: [alreadyPlayingInGame(interaction.user)],
                    ephemeral: true
                })
                .catch(log4js.trace);
            return false;
        }
        return true;
    }
    private generateSelectors(available: pointType<'city'>[]) {
        if (available.length <= 25) {
            return [
                new StringSelectMenuBuilder()
                    .setCustomId(Ids.PickCity)
                    .setMaxValues(1)
                    .setOptions(
                        available.map((opt) => ({
                            label: opt.name,
                            description: `Ralliez la ville de ${opt.name}`,
                            value: opt.id.toString()
                        }))
                    )
            ];
        } else {
            const first = available.splice(0, 25);
            return [
                new StringSelectMenuBuilder()
                    .setCustomId(Ids.PickCity)
                    .setMaxValues(1)
                    .setOptions(
                        first.map((opt) => ({
                            label: opt.name,
                            description: `Ralliez la ville de ${opt.name}`,
                            value: opt.id.toString()
                        }))
                    ),
                new StringSelectMenuBuilder()
                    .setCustomId(Ids.PickCityT)
                    .setMaxValues(1)
                    .setOptions(
                        available.map((opt) => ({
                            label: opt.name,
                            description: `Ralliez la ville de ${opt.name}`,
                            value: opt.id.toString()
                        }))
                    )
            ];
        }
    }
    private listen() {
        this.clearCollectors();
        this.collector = this.message.createMessageComponentCollector({
            componentType: ComponentType.Button
        });

        this.collector.on('collect', async (interaction) => {
            if (!this.check(interaction)) return;

            const player = this.getPlayer(interaction);
            const retreat = () => {
                player.setState('ready');
            };
            const after = () => {
                if (this.turnsRemaining === -1) return;
                this.turnsRemaining--;

                if (this.turnsRemaining === 0) {
                    this.end();
                }
            };
            if (interaction.customId === Ids.Inventory) {
                this.showInventory(interaction);
            }
            if (interaction.customId === Ids.Destination) {
                const res = await this.drawDests(interaction);
                if (!res) return;

                after();
                this.index++;
                player.setState('ready');
                this.edit();
            }
            if (interaction.customId === Ids.Place) {
                const cities = getCities();
                const available = cities.filter(
                    (x) => getPathsFor(x.id).filter((y) => !this._placed.find((z) => z.rail === y.id)).length > 0
                );

                if (!available.length || available.length === 1) {
                    interaction
                        .reply({
                            content: "Aucune ville n'est accessible",
                            ephemeral: true
                        })
                        .catch(log4js.trace);
                }
                const reply = (await interaction
                    .deferReply({ ephemeral: true, fetchReply: true })
                    .catch(log4js.trace)) as Message<true>;
                if (!reply) return retreat();
                player.setState('playing');

                const rows = this.generateSelectors(available).map((x) => row(x));
                await interaction
                    .editReply({
                        content: 'Quelle ville souhaitez-vous rallier ?',
                        components: rows
                    })
                    .catch(log4js.trace);
                if (!reply) return retreat();

                const first = await waitForInteraction({
                    componentType: ComponentType.StringSelect,
                    message: reply,
                    user: interaction.user
                }).catch(log4js.trace);

                if (!first) {
                    interaction.deleteReply().catch(log4js.trace);
                    retreat();
                    return;
                }
                first.deferUpdate().catch(log4js.trace);
                const firstCity = getCities().find((x) => x.id === parseInt(first.values[0]));
                const surrounding = getCitiesTouching(getAllTouchesWith(firstCity.id)).filter(
                    (x) => x.id !== firstCity.id
                );

                (await interaction
                    .editReply({
                        content: `À quelle ville voulez vous rallier **${firstCity.name}** ?`,
                        components: this.generateSelectors(surrounding).map((x) => row(x))
                    })
                    .catch(log4js.trace)) as Message<true>;
                if (!reply) return retreat();

                const second = await waitForInteraction({
                    componentType: ComponentType.StringSelect,
                    message: reply,
                    user: interaction.user
                }).catch(log4js.trace);

                if (!second) {
                    interaction.deleteReply().catch(log4js.trace);
                    retreat();
                    return;
                }
                second.deferUpdate().catch(log4js.trace);
                const secondCity = getCities().find((x) => x.id === parseInt(second.values[0]));
                const paths = getTouches()
                    .filter(
                        (x) =>
                            (x.from === firstCity.id && x.to === secondCity.id) ||
                            (x.from === secondCity.id && x.to === firstCity.id)
                    )
                    .map((y) => getPaths().find((x) => x.id === y.by));

                const validPaths = paths.filter((x) => !this._placed.find((y) => y.rail === x.id));
                if (!validPaths.length) {
                    interaction
                        .editReply({
                            content: "Il n'y a aucun chemin sur lequel poser des rails",
                            components: []
                        })
                        .catch(log4js.trace);
                    return retreat();
                }
                const path = validPaths[0];

                let pathIndex = 0;
                path.paths;
                if (path.paths.length > 1) {
                    await interaction
                        .editReply({
                            content: `Quel chemin voulez-vous utiliser ?`,
                            components: [
                                row(
                                    ...path.paths.map((x, i) =>
                                        button({
                                            label:
                                                x[0].color === 'any' ? 'Gris' : capitalize(colorsData[x[0].color].name),
                                            style: 'Secondary',
                                            custom: i.toString()
                                        })
                                    )
                                )
                            ]
                        })
                        .catch(log4js.trace);
                    const rep = await waitForInteraction({
                        componentType: ComponentType.Button,
                        user: interaction.user,
                        message: reply
                    }).catch(log4js.trace);

                    if (!rep) {
                        interaction.deleteReply().catch(log4js.trace);
                        return retreat();
                    }
                    await rep.deferUpdate().catch(log4js.trace);
                    pathIndex = parseInt(rep.customId);
                }

                const selectedPath = path.paths[pathIndex];
                if (selectedPath.length > player.wagons) {
                    interaction
                        .editReply({
                            content: `Vous n'avez pas assez de wagons pour faire ce chemin`,
                            components: []
                        })
                        .catch(log4js.trace);
                    return retreat();
                }

                const way = await this.getWayToPlace(player, selectedPath, interaction, reply).catch(log4js.trace);
                if (!way) {
                    interaction.deleteReply().catch(log4js.trace);
                    return retreat();
                }
                const wayArray = Object.keys(way).map((x: wagonKey) => ({ key: x, count: way[x] }));
                if (selectedPath[0].types === 'tunnel') {
                    const drawed = new Array(3).fill(null).map((x) => this.drawWag());
                    const rep = (await interaction.followUp({
                        fetchReply: true,
                        ephemeral: false,
                        content: `Vous allez construire le tunnel entre **${firstCity.name}** et **${
                            secondCity.name
                        }** avec ${sentencePack(way)}, voici vos trois cartes :`,
                        files: drawed.map((x) => this.wagonPic(x))
                    }).catch(log4js.trace)) as Message<true>;
                    if (!rep) return retreat();

                    const toPay = drawed.filter((x) => x === 'engine' || x === selectedPath[0].color).length;

                    const simulator = player.simulator;
                    const hasEnough =
                        simulator
                            .maximumEnginesBuild()
                            .map((x) => x.engines)
                            .reduce((a, b) => a + b, 0) +
                            simulator.wagons.engine >=
                        toPay;

                    if (!hasEnough) {
                        rep.edit({
                            content: "Vous n'avez pas assez de wagons pour faire la construction du tunnel"
                        }).catch(log4js.trace);
                        setDeleteTimer(rep);
                        return retreat();
                    }

                    simulator.removeWagon(...wayArray);
                    const penalities = await this.getWayToPlace(
                        player,
                        new Array(toPay)
                            .fill(null)
                            .map((x) => ({
                                color: 'any',
                                requiresEngine: true,
                                pos: [0, 0, 0, 0, 0, 0, 0, 0],
                                types: 'tunnel'
                            })),
                        interaction,
                        rep,
                        simulator,
                        true
                    );
                    if (!penalities) {
                        retreat();
                        rep.delete().catch(log4js.trace);
                        interaction.deleteReply().catch(log4js.trace);
                        return;
                    }

                    Object.keys(penalities).forEach((k) => {
                        const f = wayArray.find((x) => x.key === k);
                        if (f) f.count += penalities[k];
                        else wayArray.push({ key: k as wagonKey, count: penalities[k] });
                    });
                    rep.delete().catch(log4js.trace);
                }

                wayArray.forEach((x) => {
                    this.defalsed.wagons[x.key] += x.count;
                });
                player.removeWagon(...wayArray);
                const res = player.removeWagons(selectedPath.length);
                player.addRails(selectedPath.length);

                if (res === 'last round') {
                    this.turnsRemaining = this._players.length;
                    this.channel
                        .send({
                            reply: { messageReference: this.message },
                            content: `${interaction.user.username} n'a plus que **${player.wagons}** wagon${plurial(
                                player.wagons
                            )}\n**${this.turnsRemaining} tours restants**`
                        })
                        .catch(log4js.trace);
                }
                this._placed.push({
                    pathIndex: pathIndex as 0 | 1,
                    player: player.index,
                    rail: path.id
                });

                this.index++;
                after();
                retreat();

                interaction.deleteReply().catch(log4js.trace);
                this.edit();
            }
            if (interaction.customId === Ids.Pick) {
                player.setState('playing');

                const res = await this.drawWagInterface.show(interaction);
                player.setState('ready');

                if (res === 'cancel') return;
                player.addWagon(...res);
                this.index++;
                after();

                this.edit(true);
            }
        });
    }
    private async instanceOfSelection(
        interaction: ButtonInteraction,
        baseCollector: InteractionCollector<ButtonInteraction>
    ) {
        const player = this._players.find((x) => x.user.id === interaction.user.id);

        if (player.state !== 'idle') return interaction.deferUpdate().catch(log4js.trace);
        player.setState('preparing');
        const reply = (await interaction
            .reply({
                ephemeral: true,
                fetchReply: true,
                content: `Choisissez au moins **3** destinations\n${player.destinations
                    .map((dest) => `- ${destinationSentence(dest)}`)
                    .join('\n')}`,
                components: [
                    row(
                        new StringSelectMenuBuilder()
                            .setCustomId(Ids.PickDestinationsSelector)
                            .setMinValues(3)
                            .setMaxValues(5)
                            .setOptions(
                                player.destinations.map((dest) => ({
                                    label: destinationSentence(dest),
                                    description: resize(destinationSentence(dest, true)),
                                    value: dest.toString()
                                }))
                            )
                    )
                ]
            })
            .catch(log4js.trace)) as Message<true>;
        if (!reply) return;

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            max: 1,
            time: 120000
        });
        this.collectors.push(collector);
        collector.on('collect', (ctx) => {
            ctx.deferUpdate();
            const values = ctx.values.map((x) => parseInt(x));

            const removed = player.keepOnlyThese(values);
            removed.forEach((x) => {
                this.defalseDest(x);
            });
            player.setState('ready');

            if (this._players.filter((x) => x.state === 'ready').length === this._players.length) {
                this.started = true;
                this.edit();
                this.listen();
                baseCollector.stop();
            } else {
                this.edit(true);
            }
            interaction.deleteReply().catch(log4js.trace);
        });
        collector.on('end', (c) => {
            if (c.size === 0) {
                player.setState('idle');
                interaction.deleteReply().catch(log4js.trace);
            }
        });
    }
    private listenForPreparation() {
        const collector = this.message.createMessageComponentCollector({
            componentType: ComponentType.Button
        });

        this.collectors.push(collector);
        collector.on('collect', (interaction) => {
            if (!this.check(interaction)) return;

            if (interaction.customId === Ids.PickDestinations) {
                this.instanceOfSelection(interaction, collector);
            }
        });
    }

    // Management
    private distributeCard<T extends cardType>(
        player: number,
        type: T,
        ...cards: (T extends 'wagon' ? wagonKey : number)[]
    ) {
        const play = this._players[player];
        if (type === 'destination') {
            play.addDestinations(...(cards as number[]));
        } else {
            play.addWagon(...(cards as wagonKey[]));
        }
    }
    private drawDest() {
        const id = this.decks.destinations[0];
        this.defalseDest(id);

        return id;
    }
    private defalseDest(id: number) {
        this.decks.destinations = this.decks.destinations.filter((x) => x !== id);
        this.defalsed.destinations.push(id);
    }
    private refillWag() {
        this.decks.wagons = JSON.parse(JSON.stringify(this.defalsed.wagons));
        this.defalsed.wagons = this.defaultDecks.defalsed;
    }
    public drawWag(defalse = true) {
        let totalCards = Object.values(this.decks.wagons).reduce((total, count) => total + count, 0);

        if (totalCards === 0) {
            this.refillWag();
            totalCards = Object.values(this.decks.wagons).reduce((total, count) => total + count, 0);
        }

        const randomIndex = random({ max: totalCards, min: 1 });

        let accumulatedCount = 0;
        let selectedCard: wagonKey;

        for (const [card, count] of Object.entries(this.decks.wagons)) {
            accumulatedCount += count;
            if (randomIndex <= accumulatedCount) {
                selectedCard = card as wagonKey;
                break;
            }
        }
        if (defalse) this.defalseWag(selectedCard);
        return selectedCard;
    }
    public defalseWag(wagonKey: wagonKey) {
        this.decks.wagons[wagonKey]--;
        this.defalsed.wagons[wagonKey]++;
    }
    private async end() {
        this.clearCollectors();

        this?.message?.edit({
                components: [],
                content: 'Partie terminée'
            })?.catch(log4js.trace);

        const datas = this._players
            .map((x) => x.calculateEndPoints())
            .sort((a, b) => a.player.points + b.player.points);
        const gtWinners = datas.filter((x) => x.player.points === datas[0].player.points && x.player.points > 0);

        gtWinners.forEach((gt, i) => {
            datas[i].gtBonus = true;
            gt.player.addPoints(10);
        });
        const isEquality = () => {
            return datas.filter((x) => x.player.points === datas[0].player.points).length > 1;
        };
        const equalisedPlayers = () => {
            return datas.filter((x) => x.player.points === datas[0].player.points);
        };
        if (isEquality()) {
            const slice = equalisedPlayers().length;
            const highest = equalisedPlayers().sort((a, b) => a.done + b.done);

            datas.splice(0, slice, ...highest);
        }
        if (isEquality()) {
            const slice = equalisedPlayers().length;
            const highest = equalisedPlayers().sort(
                (a, b) =>
                    a.table.sort((c, d) => c.length + d.length)[0].length +
                    b.table.sort((c, d) => c.length + d.length)[0].length
            );

            datas.splice(0, slice, ...highest);
        }

        const img = await this.generator.generateEnd(datas);
        this.channel
            .send({
                files: [new AttachmentBuilder(img, { name: 'classement.png' })],
                reply: {
                    messageReference: this.message,
                    failIfNotExists: false
                }
            })
            .catch(log4js.trace);
    }

    private clearCollectors() {
        this.collectors
            .filter((x) => !x.ended)
            .forEach((collector) => {
                collector.stop();
            });
    }

    // Generation
    private async generatePlate() {
        const plate = await this.generator.generate();
        if (!plate) return;

        return plate.toBuffer('image/jpeg');
    }
    private generateComponents() {
        return [
            row(
                button({
                    label: 'Piocher des wagons',
                    style: 'Primary',
                    id: 'Pick'
                }),
                button({
                    label: 'Piocher des destinations',
                    style: 'Secondary',
                    id: 'Destination',
                    disabled: this.decks.destinations.length === 0
                }),
                button({
                    label: 'Placer des wagons',
                    style: 'Secondary',
                    id: 'Place'
                }),
                button({
                    label: 'Inventaire',
                    style: 'Secondary',
                    id: 'Inventory'
                })
            )
        ];
    }
    private get messageContent() {
        if (!this.started) return this._players.filter(x => x.state === 'idle' || x.state === 'preparing').map(x => `<@${x.user.id}>`).join(', ')
        return `<@${this.current.user.id}>`;
    }
    private async generateContent(): Promise<MessageEditOptions & MessageCreateOptions> {
        const plate = await this.generatePlate();
        if (!plate) return;

        const attach = new AttachmentBuilder(plate, { name: 'plate.jpg' });
        if (!this.started)
            return {
                files: [attach],
                components: [
                    row(button({ label: 'Prendre les destinations', id: 'PickDestinations', style: 'Secondary' }))
                ],
                content: this.messageContent
            };
        return {
            files: [attach],
            components: this.generateComponents(),
            content: this.messageContent
        };
    }

    private async edit(onlyContent = false) {
        if (onlyContent) {
            this.message.edit({ content: this.messageContent }).catch(log4js.trace);
            return;
        }
        const content = await this.generateContent();
        if (!content) return;

        await this.message.edit(content).catch(log4js.trace);
    }

    // Initiation
    private get defaultDecks() {
        return {
            enabled: {
                black: 12,
                blue: 12,
                red: 12,
                yellow: 12,
                orange: 12,
                green: 12,
                pink: 12,
                white: 12,
                engine: 14
            },
            defalsed: {
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
    }
    private shuffleCards() {
        this.decks.destinations = shuffleArray(this.decks.destinations);
    }
    private distributeCards() {
        for (let i = 0; i < 5; i++) {
            this._players.forEach((player) => {
                if (i < 4) {
                    const card = this.drawWag();
                    player.addWagon(card);
                }
                const card = this.drawDest();
                player.addDestinations(card);
            });
        }
    }
    private async start() {
        this.shuffleCards();
        this.users.forEach((u, i) => {
            this._players.push(
                new Player({
                    user: u,
                    index: i,
                    color: this.colors[i],
                    game: this
                })
            );
        });
        this.distributeCards();

        const content = await this.generateContent();
        if (!content) return this.end();

        this.message = (await this.channel.send(content).catch(log4js.trace)) as Message<true>;
        if (!this.message) return this.end();

        games.push(this);
        this.listenForPreparation();
    }
}
