import { Db } from '../module2/database2';
import Wallet from '../models2/wallet';

export class WalletDb extends Db<Wallet> {
  constructor() {
    super('wallet', 'v1');
  }
}
