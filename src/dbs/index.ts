import PriceDB from './price';
import WalletDB from './wallet';
import XpubDB from './xpub';
import TransactionDB from './transactions';
import AddressDB from './address';
import ReceiveAddressDB from './receiveAddress';
import NotificationDB from './notification';
import DeviceDB from './device';
import Erc20DB from './erc20';
import PassEncrypt from './passHash'
export {
  PriceDB,
  WalletDB,
  XpubDB,
  TransactionDB,
  AddressDB,
  ReceiveAddressDB,
  NotificationDB,
  DeviceDB,
  Erc20DB,
  PassEncrypt
};
export enum PassEncryptErrType {
  DECRYPTION_FAIL,
  OBJ_UNDEF,
  ANALYTICS_ID_UNDEF
}

const defaultErrorMessages = {
  [PassEncryptErrType.DECRYPTION_FAIL]: 'decryption failure',
  [PassEncryptErrType.OBJ_UNDEF]: 'pass-encrypt obj not present',
  [PassEncryptErrType.ANALYTICS_ID_UNDEF]:'analytics id not defined. unexpected err.'
};

export class PassEncryptError extends Error {
  public errorType: PassEncryptErrType;
  constructor(errorType: PassEncryptErrType, msg?: string) {
    let message = msg;

    if (!msg && defaultErrorMessages[errorType]) {
      message = defaultErrorMessages[errorType];
    }

    super(message);
    this.errorType = errorType;

    Object.setPrototypeOf(this, PassEncryptError.prototype);
  }
}

