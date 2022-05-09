export enum BIPType {
  BIP32 = 0,
  BIP44 = 1
}
export default interface ISendAddress {
  address: string;
  walletId: string;
  coinType: string;
  chainIndex: number;
  addressIndex: number;
  isSegwit: boolean;
  bipType?: BIPType;
}
