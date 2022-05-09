import { Db } from '../module2/database';
import ReceiveAddress from '../models2/receiveAddress';

export class ReceiveAddressDb extends Db<ReceiveAddress> {
  constructor() {
    super('receiveAddress');
    this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            address TEXT NOT NULL,
            walletId TEXT NOT NULL,
            coinType TEXT NOT NULL,
            PRIMARY KEY (address)
        )`);
  }
}
