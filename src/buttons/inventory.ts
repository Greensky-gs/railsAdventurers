import { ButtonHandler, log4js } from "amethystjs";
import { Ids } from "../data/ids";
import { games } from "../cache/games";
import { inventory, notPlaying } from "../contents/embeds";

export default new ButtonHandler({
    customId: Ids.RefreshInventory
}).setRun(async({ button, message, user }) => {
    const game = games.find(x => x.players.find(y => y.user.id === user.id));
    if (!game) {
        await button.reply({
            embeds: [notPlaying(user)],
            ephemeral: true
        }).catch(log4js.trace)
        return message.edit({
            components: []
        })
    }
    message.edit({
        embeds: [ inventory(game.players.find(p => p.user.id === user.id)) ]
    }).catch(log4js.trace)
})