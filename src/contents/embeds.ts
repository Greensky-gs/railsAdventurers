import { EmbedBuilder, User } from "discord.js";
import { Player } from "../structure/Player";
import { wagonKey } from "../typings/datas";
import { colorsData } from "../data/colors";
import { destinationSentence, getDestinations } from "../utils/core";

const base = (user: User) => new EmbedBuilder().setFooter({
    text: user.username,
    iconURL: user.displayAvatarURL({ forceStatic: false })
}).setTimestamp();

export const baseDenied = (user: User) => base(user).setColor('#850913')
export const baseReply = (user: User) => base(user).setColor('#C19273')
export const notParticipating = (user: User) => baseDenied(user).setTitle("Vous ne participez pas").setDescription(`Vous ne jouez pas à cette partie`)
export const notYourTurn = (user: User) => baseDenied(user).setTitle("Pas votre tour").setDescription(`Ce n'est pas à votre tour de jouer`)
export const alreadyPlaying = (user: User) => baseDenied(user).setTitle("Partie en cours").setDescription(`Vous avez déjà une partie en cours`)
export const alreadyPlayingInGame = (user: User) => baseDenied(user).setTitle("Action en cours").setDescription(`Vous êtes déjà en train de faire quelque chose`);
export const inventory = (player: Player) => baseReply(player.user).setTitle("Inventaire").setFields({
    name: 'Points',
    value: `**${player.points}**`,
    inline: true
}, {
    name: 'Destinations',
    value: `${player.destinations.map(dest => destinationSentence(dest)).join('\n')}`,
    inline: true
}, {
    name: 'Wagons restants',
    value: player.wagons.toString(),
    inline: true
    }).setDescription(`Vos cartes :\n${Object.keys(player.wagonsCard).filter(x => player.wagonsCard[x] > 0).map((k: wagonKey) => `${player.wagonsCard[k]} ${k === 'engine' ? 'locomotives' : colorsData[k].name}`).join('\n')}`)
export const notPlaying = (user: User) => baseDenied(user).setTitle("Partie terminée").setDescription(`Cette partie est terminée`)
export const baseInfo = (user: User) => base(user).setColor('#BB35E2')
export const drawWag = (user: User) => baseInfo(user).setTitle("Pioche").setDescription(`Piochez jusqu'a 2 cartes wagons`)