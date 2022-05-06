import { Db } from '../module2/database';
import Wallet from '../models2/wallet';

export class WalletDb extends Db<Wallet> {
    constructor() {
        super('wallet');
        this.executeSql(`
            CREATE TABLE IF NOT EXISTS ${this.table} (
            id TEXT NOT NULL,
            deviceId int NOT NULL,
            name text NOT NULL,
            passphraseSet boolean NOT NULL,
            passwordSet boolean NOT NULL,
            PRIMARY KEY (id, deviceId)
        )`);
    }
}