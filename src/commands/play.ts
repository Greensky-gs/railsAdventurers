import { AmethystCommand, log4js, preconditions, waitForInteraction } from 'amethystjs';
import { ApplicationCommandOptionType, ComponentType, Message, TextChannel, User } from 'discord.js';
import { GameOrder, GameMode } from '../typings/commands';
import validUsers from '../preconditions/validUsers';
import { button, isPlaying, matchmaked, row, shuffleArray } from '../utils/toolbox';
import { alreadyPlaying, baseDenied, baseInfo, canceled, matchmakingEmbed } from '../contents/embeds';
import { Ids } from '../data/ids';
import { Game } from '../structure/Game';
import { playerColor } from '../typings/player';

export default new AmethystCommand({
    name: 'partie',
    description: 'Lance une partie',
    options: [
        {
            name: 'visibilité',
            description: 'La visibilité de la partie lors de la création',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                {
                    name: "Publique - n'importe qui peut rejoindre",
                    value: GameMode.Public
                },
                {
                    name: 'Privée - seuls les utilisateurs que vous choisissez peuvent rejoindre',
                    value: GameMode.Private
                }
            ]
        },
        {
            name: 'joueurs',
            description: 'Nombre de joueurs que vous voulez dans votre partie',
            type: ApplicationCommandOptionType.Integer,
            maxValue: 3,
            minValue: 2,
            required: false
        },
        {
            name: 'joueur_1',
            description: 'Premier joueur que vous voulez ajouter',
            required: false,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'joueur_2',
            description: 'Premier joueur que vous voulez ajouter',
            required: false,
            type: ApplicationCommandOptionType.User
        },
        {
            name: 'odre',
            description: 'Ordre des joueurs',
            required: false,
            type: ApplicationCommandOptionType.String,
            choices: [
                {
                    name: 'Aléatoire',
                    value: GameOrder.Random
                },
                {
                    name: "Ordre de d'arrivée",
                    value: GameOrder.Acceptation
                },
                {
                    name: "Ordre de choix - l'ordre dans lequel vous avez spécifié les joueurs",
                    value: GameOrder.Specification
                }
            ]
        }
    ],
    preconditions: [preconditions.GuildOnly, validUsers]
}).setChatInputRun(async ({ interaction, options }) => {
    if (isPlaying(interaction.user))
        return interaction
            .reply({
                embeds: [alreadyPlaying(interaction.user)],
                ephemeral: true
            })
            .catch(log4js.trace);
    if (matchmaked(interaction.user))
        return interaction
            .reply({
                embeds: [matchmakingEmbed(interaction.user)],
                ephemeral: true
            })
            .catch(log4js.trace);

    const visibility = options.getString('visibilité') ?? GameMode.Public;
    const players = options.getInteger('joueurs') ?? 3;
    const player1 = options.getUser('joueur_1');
    const player2 = options.getUser('joueur_2');
    const order = options.getString('ordre') ?? GameOrder.Random;

    const selected = [player1, player2].filter((x) => !!x && !isPlaying(x) && !matchmaked(x));
    if (!player1 && !player2 && visibility === GameMode.Private)
        return interaction
            .reply({
                embeds: [baseDenied(interaction.user).setDescription(`Vous n'avez spécifié aucun utilisateur`)],
                ephemeral: true
            })
            .catch(log4js.trace);
    if (selected.length === 0 && visibility === GameMode.Private)
        return interaction
            .reply({
                embeds: [
                    baseDenied(interaction.user)
                        .setTitle('Partie annulée')
                        .setDescription(`Les personnes que vous avez choisit ne sont pas éligibles`)
                ]
            })
            .catch(log4js.trace);

    let list = [interaction.user];
    const endsAt = Date.now() + 240000;
    const ping = (x: User) => `<@${x.id}>`;
    const embed = () => {
        return baseInfo(interaction.user)
            .setTitle('Partie')
            .setDescription(
                `Une partie des aventuriers du rail va  commencer.\nJoueurs :${list
                    .map(ping)
                    .join(' ')}\nNombre maximum de joueurs : **${players}**\n\nDémarrage automatique <t:${Math.floor(
                    endsAt / 1000
                )}:R>`
            );
    };
    const components = () => {
        return [
            row(
                button({
                    label: 'Participer',
                    style: 'Success',
                    id: 'PlayAccept'
                }),
                button({
                    label: 'Refuser',
                    style: 'Danger',
                    id: 'PlayDecline'
                }),
                button({
                    label: 'Démarrer',
                    style: 'Primary',
                    id: 'PlayStart',
                    disabled: list.length < 2
                }),
                button({
                    label: 'Annuler',
                    style: 'Danger',
                    id: 'PlayCancel'
                }),
                button({
                    label: `${list.length}/${players}`,
                    style: 'Secondary',
                    custom: 'no.id',
                    disabled: true
                })
            )
        ];
    };
    const panel = (await interaction
        .reply({
            embeds: [embed()],
            content: selected.length > 0 ? selected.map(ping).join(' ') : undefined,
            components: components(),
            fetchReply: true
        })
        .catch(log4js.trace)) as Message<true>;
    if (!panel) return;

    const edit = () => {
        interaction
            .editReply({
                embeds: [embed()],
                components: components()
            })
            .catch(log4js.trace);
    };
    const collector = panel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 240000
    });

    const allowed = selected.concat(interaction.user);
    const accepted = selected.map(() => false);
    collector.on('collect', async (ctx) => {
        if (visibility === GameMode.Private && !allowed.find((x) => x.id === ctx.user.id)) {
            ctx.reply({
                content: 'Vous ne pouvez pas interagir avec ce message',
                ephemeral: true
            }).catch(log4js.trace);
            return;
        }

        if (ctx.customId === Ids.PlayAccept) {
            if (list.find((x) => x.id === ctx.user.id)) {
                ctx.reply({
                    content: 'Vous participez déjà',
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }
            if (visibility === GameMode.Private && allowed.find((x) => x.id === ctx.user.id)) {
                if (list.length < players) {
                    list.push(ctx.user);
                    const index = selected.indexOf(selected.find((x) => x.id === ctx.user.id));
                    accepted[index] = true;
                }
            } else if (visibility === GameMode.Private) {
                ctx.reply({
                    content: 'Vous ne pouvez pas participer à cette partie',
                    ephemeral: true
                }).catch(log4js.trace);
            } else {
                if (selected.find((x) => x.id === ctx.user.id)) {
                    if (list.length < players) {
                        list.push(ctx.user);
                        const index = selected.indexOf(selected.find((x) => x.id === ctx.user.id));
                        accepted[index] = true;
                    }
                } else {
                    if (list.length < players) {
                        const priorityRemaining = accepted.filter((x) => !x).length;
                        if (players - list.length - priorityRemaining === 0) {
                            ctx.reply({
                                content: `Veuillez laisser la priorité à ceux qui ont été sélectionnés`
                            }).catch(log4js.trace);
                            return;
                        }

                        list.push(ctx.user);
                    }
                }
            }

            if (list.length === players) {
                collector.stop('start');
            } else {
                ctx.deferUpdate().catch(() => {});
                edit();
            }
        }
        if (ctx.customId === Ids.PlayCancel) {
            if (ctx.user.id !== interaction.user.id) {
                ctx.reply({
                    content: 'Vous ne pouvez pas annuler la partie',
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }

            const res = (await ctx
                .reply({
                    ephemeral: true,
                    content: `Êtes-vous sûr de vouloir annuler ?`,
                    components: [
                        row(
                            button({ label: 'Oui', id: 'Yes', style: 'Success' }),
                            button({ label: 'Non', id: 'No', style: 'Danger' })
                        )
                    ],
                    fetchReply: true
                })
                .catch(log4js.trace)) as Message<true>;
            if (!res) return;

            const rep = await waitForInteraction({
                message: res,
                user: interaction.user,
                componentType: ComponentType.Button
            }).catch(log4js.trace);
            const cancel = () => {
                ctx.editReply({
                    embeds: [canceled()],
                    content: '** **',
                    components: []
                }).catch(log4js.trace);
            };
            if (!rep || rep.customId === Ids.No) {
                cancel();
                return;
            } else {
                rep.editReply({
                    components: [],
                    content: 'Partie annulée'
                }).catch(log4js.trace);
            }

            collector.stop('cancel');
        }
        if (ctx.customId === Ids.PlayDecline) {
            if (!list.find((x) => x.id === ctx.user.id)) {
                ctx.reply({
                    content: 'Vous ne participez pas',
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }

            list = list.filter((x) => x.id !== ctx.user.id);
            if (selected.find((x) => x.id === ctx.user.id)) {
                const index = selected.indexOf(selected.find((x) => x.id === ctx.user.id));
                accepted[index] = true;
            }
            edit();
            ctx.deferUpdate().catch(log4js.trace);
        }
        if (ctx.customId === Ids.PlayStart) {
            if (ctx.user.id !== interaction.user.id) {
                ctx.reply({
                    content: 'Vous ne pouvez pas démarrer la partie',
                    ephemeral: true
                }).catch(log4js.trace);
                return;
            }
            await ctx.deferUpdate().catch(log4js.trace);
            collector.stop('start');
        }
    });

    collector.on('end', async (_c, reason) => {
        if (reason === 'start') {
            await interaction
                .editReply({
                    embeds: [],
                    content: `La partie va commencer`,
                    components: []
                })
                .catch(log4js.trace);

            const specificated = (): typeof list => {
                const template = list.filter((x) => x.id !== interaction.user.id);

                const res = [
                    interaction.user,
                    player1,
                    player2,
                    ...template.filter((x) => !selected.find((y) => y.id === x.id))
                ].filter((x) => !!x);
                return res;
            };
            new Game({
                channel: interaction.channel as TextChannel,
                colors: shuffleArray((['black', 'purple', 'white'] as playerColor[]).splice(0, list.length)) as [
                    playerColor,
                    playerColor,
                    playerColor?
                ],
                users: (order === GameOrder.Random
                    ? shuffleArray(list)
                    : order === GameOrder.Acceptation
                    ? list
                    : specificated()) as [User, User, User?]
            });
        } else {
            interaction
                .editReply({
                    embeds: [canceled()],
                    content: '** **',
                    components: []
                })
                .catch(log4js.trace);
        }
    });
});
