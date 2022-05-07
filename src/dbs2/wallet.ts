import { Db } from '../module2/database';
import Wallet from '../models2/wallet';

export class WalletDb extends Db<Wallet> {
  constructor() {
    super('wallet');
    this.executeSql(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
            id TEXT NOT NULL,
            device TEXT NOT NULL,
            name text NOT NULL,
            passphraseSet boolean NOT NULL,
            passwordSet boolean NOT NULL,
            PRIMARY KEY (id, device)
        )`);
  }

  public transform(w: Wallet): Wallet {
    w.passphraseSet = w.passphraseSet === true;
    w.passwordSet = w.passwordSet === true;
    return w;
  }

  public async getOne(query: Partial<Wallet>): Promise<Wallet | null> {
    const wallet = await super.getOne(query);
    if (wallet) return this.transform(wallet);
    return null;
  }

  public async getAll(query?: Partial<Wallet>): Promise<Wallet[]> {
    const wallets = await super.getAll(query);
    return wallets.map(d => this.transform(d));
  }
}
