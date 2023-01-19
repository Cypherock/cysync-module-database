import IModel from './model';

export default interface Account extends IModel {
  name: string;
  accountId?: string;
  walletId: string;
  coinId: string;
  /**
   * @deprecated
   * uniquer identifier for the coin.
   */
  slug?: string;
  xpub: string;
  accountType?: string;
  accountIndex: number;
  derivationPath: string;
  totalBalance: string;
  totalUnconfirmedBalance: string;
}
