import IModel from './model';

export default interface IHardwareWallet extends IModel {
  walletId: string;
  name: string;
  passwordSet: boolean;
  passphraseSet: boolean;
}
