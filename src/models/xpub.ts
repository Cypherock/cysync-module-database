import IModel from './model';

export default interface IXpub extends IModel {
  xpub: string;
  zpub?: string;
  walletId: string;
  coin: string;
  balance: any;
}
