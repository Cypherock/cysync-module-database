import IModel from "./model";

enum INTERVAL {
    WEEK = 7,
    MONTH = 30,
    YEAR = 365
}

export default interface IPriceHistory extends IModel {
    /**
     * uniquer identifier for the asset.
     */
    slug: string;
    interval: INTERVAL;
    /**
     * The data points are stored in the format of array of [timestamp, price]
     * As per the existing API, the number of data points for each interval is described below:
     * Week - 7 x 24 = 168
     * Month - 30 x 24 = 720
     * Year - 365 
     */
    data: number[][]
}