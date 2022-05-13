enum INTERVAL {
    WEEK = 7,
    MONTH = 30,
    YEAR = 365
}

export default interface IPriceHistory {
    slug: string;
    interval: INTERVAL;
    timestamp: number;
    value: boolean;
    passphraseSet: boolean;
}