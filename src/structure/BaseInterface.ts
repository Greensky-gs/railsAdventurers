import { InterfaceCallback, InterfaceEndReason } from "../typings/core";

export class BaseInterface {
    public ended: boolean = false;
    public callback: InterfaceCallback = () => {}

    public on(callback: InterfaceCallback) {
        this.callback = callback;
    }

    public end(reason: InterfaceEndReason) {
        if (!this.ended) {
            this.ended = true;
            this.callback(reason);
        }
    }
}