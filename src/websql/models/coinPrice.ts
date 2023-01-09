import IModel from './model';

export default interface CoinPrice extends IModel {
  coinId: string;
  price: number;
  // stores the timestamp of the last price update in unix epoch time format
  priceLastUpdatedAt: number | undefined;
}
