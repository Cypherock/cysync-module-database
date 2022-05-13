import IModel from "./model";

export default interface IReceiveAddress extends IModel {
  address: string;
  walletId: string;
  coinType: string;
}
