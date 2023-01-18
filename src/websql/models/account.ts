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
  totalBalance: string;
  totalUnconfirmedBalance: string;
  metadata?: Metadata;
}
export interface NearMetadata {
  nativeBalance: string;
  reservedStorage: string;
}
export interface Metadata {
  near?: NearMetadata;
}
