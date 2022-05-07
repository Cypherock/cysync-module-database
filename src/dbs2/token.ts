import { Db } from '../module2/database';
import Token from '../models2/token';

export class TokenDb extends Db<Token> {
  constructor() {
    super('token');
    this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            walletId TEXT NOT NULL,
            networkId INTEGER,
            coin TEXT NOT NULL,
            slug TEXT NOT NULL,
            price TEXT NOT NULL,
            balance TEXT NOT NULL,
            PRIMARY KEY (walletId, coin, slug)
        )`);
  }

  public async updateBalance(walletId: string, coin: string, balance: string) {
    await this.executeSql(
      `UPDATE ${this.table} SET balance = ? WHERE walletId = ? AND coin = ?`,
      [balance, walletId, coin]
    );
    this.emit('update');
  }
}
