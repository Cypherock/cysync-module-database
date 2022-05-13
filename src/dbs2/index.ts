import { WalletDb } from './wallet';
import { DeviceDb } from './device';
import { TokenDb } from './token';
import { CoinDb } from './coin';
import { SendAddressDb } from './sendAddress';
import { ReceiveAddressDb } from './receiveAddress';
import { TransactionDb } from './transaction';
import { NotificationDb } from './notification';
import PassEncrypt from './passHash';
import PriceHistoryDb from './priceHistory';

export {
  WalletDb as WalletDb2,
  DeviceDb as DeviceDb2,
  TokenDb as TokenDb2,
  CoinDb as CoinDb2,
  SendAddressDb,
  ReceiveAddressDb as ReceiveAddressDb2,
  TransactionDb as TransactionDb2,
  PassEncrypt,
  NotificationDb as NotificationDb2,
  PriceHistoryDb
};
