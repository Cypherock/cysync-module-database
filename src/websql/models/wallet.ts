import IModel from './model';

export default interface IWallet extends IModel {
  device: string;
  name: string;
  passwordSet: boolean;
  passphraseSet: boolean;
}
