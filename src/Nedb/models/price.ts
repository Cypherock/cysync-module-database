import IModel from './model';

export default interface IPrice extends IModel {
  coin: string;
  days: number;
  data: number[][];
}
