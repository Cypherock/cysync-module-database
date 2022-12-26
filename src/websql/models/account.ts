import IModel from './model';

export default interface Account extends IModel {
  accountId?: string;
  walletId: string;
  coinId: string;
  /**
   * uniquer identifier for the coin.
   */
  slug: string;
  xpub: string;
  accountType?: string;
  accountIndex: number;
  totalBalance: string;
  totalUnconfirmedBalance: string;
}
