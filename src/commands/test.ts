import { AmethystCommand } from 'amethystjs';
import { ApplicationCommandOptionType, TextChannel } from 'discord.js';
import { Game } from '../structure/Game';

export default new AmethystCommand({
    name: 'test',
    description: 'Teste le bot',
    options: [
        {
            name: 'utilisateur',
            description: 'User',
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ]
}).setChatInputRun(async ({ interaction, options }) => {
    await interaction.reply('Starting');
    const user = options.getUser('utilisateur');

    const game = new Game({
        channel: interaction.channel as TextChannel,
        users: [interaction.user, user],
        colors: ['black', 'white']
    });
});
