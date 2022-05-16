import IModel from './model';

enum BIPType {
  BIP32 = 0,
  BIP44 = 1
}
export default interface ISendAddress extends IModel {
  address: string;
  walletId: string;
  coinType: string;
  chainIndex: number;
  addressIndex: number;
  /**
   * As a part of BIP141, a superior efficient Tx format Segwit was introduced.
   */
  isSegwit: boolean;
  /**
   * Currently not utilised. But a field that is expected to store BIPType of the address.
   */
  bipType?: BIPType;
}
