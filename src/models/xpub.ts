import IModel from './model';

export interface XpubBalance {
  balance: string;
  unconfirmedBalance: string;
}

export default interface IXpub extends IModel {
  xpub: string;
  zpub?: string;
  walletId: string;
  coin: string;
  xpubBalance: XpubBalance;
  zpubBalance?: XpubBalance;
  totalBalance: XpubBalance;
}
