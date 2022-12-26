import IModel from './model';

export default interface IReceiveAddress extends IModel {
  accountId: string;
  address: string;
  walletId: string;
  coinType: string;
}
