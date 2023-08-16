import { Player } from "../structure/Player";

export type getCards = {};
export type InterfaceEndReason = 'cancel' | 'time';
export type InterfaceCallback = (reason: InterfaceEndReason) => unknown;
export type DrawInterfaceStep = 'idle' | 'shown' | 'firstpicked';
export type endReturn = {
    done: number,
    table: number[][],
    player: Player,
    gtBonus: boolean
}