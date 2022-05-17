import IModel from './model';

export default interface IAddress extends IModel {
  address: string;
  xpub: string;
  coinType: string;
  chainIndex: number;
  addressIndex: number;
  isSegwit: boolean;
}
