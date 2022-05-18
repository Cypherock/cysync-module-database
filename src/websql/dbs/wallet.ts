import { Database } from '../module/database';
import Wallet from '../models/wallet';

export class WalletDB extends Database<Wallet> {
  constructor() {
    super('wallet', 'v1');
  }
}
