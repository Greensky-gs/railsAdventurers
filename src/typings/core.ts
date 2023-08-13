export type getCards = {};
export type InterfaceEndReason = 'cancel' | 'time';
export type InterfaceCallback = (reason: InterfaceEndReason) => unknown;
export type DrawInterfaceStep = 'idle' | 'shown' | 'firstpicked';
