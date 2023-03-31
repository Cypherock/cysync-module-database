import { Database } from '../module/database';
import Wallet from '../models/wallet';
import { FileDB } from '../module/fileDatabase';

/**
 * WalletDB stores the wallets information of a user.
 */
export class WalletDB extends Database<Wallet> {
  constructor() {
    super('wallet', { databaseVersion: 'v1' });
  }
}

export class WalletFileDB extends FileDB {
  constructor(filePath='data-test.json') {
    super('wallet', filePath);
  }
}