import IModel from "./model";

/**
 * A model to store the coin information. Here, coin refers to the native currency of the network.
 * For example, ETH is the native currency of Ethereum.
 * USDT, USDC are not meant to be stored here. Use TokenDB instead.
 */
export default interface Coin extends IModel {
  walletId: string;
  /**
   * uniquer identifier for the coin.
   */
  slug: string;
  price: number;
  xpub: string;
  zpub?: string;
  xpubBalance: string;
  xpubUnconfirmedBalance: string;
  zpubBalance?: string;
  zpubUnconfirmedBalance?: string;
  totalBalance: string;
  totalUnconfirmedBalance: string;
}
