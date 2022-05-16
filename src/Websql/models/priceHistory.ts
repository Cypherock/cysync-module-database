import IModel from "./model";

enum INTERVAL {
    WEEK = 7,
    MONTH = 30,
    YEAR = 365
}

export default interface IPriceHistory extends IModel {
    slug: string;
    interval: INTERVAL;
    data: number[][]
}