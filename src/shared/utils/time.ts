export const now = (): Date => new Date();

export const secondsSince = (start: number): number => (Date.now() - start) / 1000;
