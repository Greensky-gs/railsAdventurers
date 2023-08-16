import { AmethystEvent, commandDeniedCode, log4js } from "amethystjs";

export default new AmethystEvent('commandDenied', (cmd, reason) => {
    if (reason.code === commandDeniedCode.GuildOnly && cmd.interaction.isCommand()) {
        cmd.interaction.reply({
            content: "Cette commande n'est pas exécutable en messages privés"
        }).catch(log4js.trace)
    }
})