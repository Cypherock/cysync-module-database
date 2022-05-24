import { Database } from '../module/database';
import Wallet from '../models/wallet';

/**
 * WalletDB stores the wallets information of a user.
 */
export class WalletDB extends Database<Wallet> {
  constructor() {
    super('wallet', 'v1');
  }
}
