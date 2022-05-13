import IModel from "./model";

enum ISENCRYPTED {
  NO = 0,
  YES = 1
}

export default interface Coin extends IModel {
  walletId: string;
  networkId: number;
  slug: string;
  price: string;
  xpub: string;
  zpub?: string;
  xpubBalance: string;
  xpubUnconfirmedBalance: string;
  zpubBalance?: string;
  zpubUnconfirmedBalance?: string;
  totalBalance: string;
  totalUnconfirmedBalance: string;
  isEncrypted?: ISENCRYPTED;
}
