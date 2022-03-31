import IModel from './model';

export default interface ILatestPrice extends IModel {
  coin: string;
  price: number;
}
