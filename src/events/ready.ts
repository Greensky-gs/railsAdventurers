import { AmethystEvent } from "amethystjs";
import { ActivityType } from "discord.js";

export default new AmethystEvent('ready', (client) => {
    client.user.setActivity({
        name: "aux aventuriers du rail",
        type: ActivityType.Playing
    });
})