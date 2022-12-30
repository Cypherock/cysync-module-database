import IModel from './model';

export default interface IReceiveAddress extends IModel {
  accountId: string;
  coinId: string;
  address: string;
  walletId: string;
  /**
   * @deprecated
   */
  coinType?: string;
}
