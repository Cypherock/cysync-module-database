import IModel from "./model";

export default interface Token extends IModel {
  walletId: string;
  networkId: number;
  coin: string;
  slug: string;
  price: number;
  balance: string;
}
