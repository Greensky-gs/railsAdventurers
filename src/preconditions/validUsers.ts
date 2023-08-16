import { Precondition, log4js } from 'amethystjs';
import { ApplicationCommandOptionType } from 'discord.js';
import { invalidUsers } from '../contents/embeds';

export default new Precondition('valid users').setChatInputRun(({ interaction, options }) => {
    const users = options.data.filter((x) => x.type === ApplicationCommandOptionType.User).map((x) => x.user);
    const invalid = users.filter(
        (x) => x.bot || x.id === interaction.user.id || users.filter((y) => y.id === x.id).length > 1
    );

    if (invalid.length > 0) {
        interaction
            .reply({
                embeds: [invalidUsers(interaction.user, invalid)],
                ephemeral: true
            })
            .catch(log4js.trace);
        return {
            ok: false,
            type: 'chatInput',
            interaction,
            metadata: {
                silent: true
            }
        };
    }
    return {
        ok: true,
        type: 'chatInput',
        interaction
    };
});
