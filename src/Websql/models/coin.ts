import IModel from "./model";



export default interface Coin extends IModel {
  walletId: string;
  networkId: number;
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
