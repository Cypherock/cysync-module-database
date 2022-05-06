import { Db } from '../module2/database';
import Coin from '../models2/coin';

export class CoinDb extends Db<Coin> {

    constructor() {
        super('device');
        this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            walletId TEXT NOT NULL,
            networkId INTEGER NOT NULL,
            slug TEXT NOT NULL,
            price TEXT NOT NULL,
            xpub TEXT NOT NULL,
            zpub TEXT,
            xpubBalance TEXT NOT NULL,
            xpubUnconfirmedBalance TEXT NOT NULL,
            zpubBalance TEXT,
            zpubUnconfirmedBalance TEXT,
            totalBalance TEXT NOT NULL,
            totalUnconfirmedBalance TEXT NOT NULL,
            PRIMARY KEY (walletId, networkId, slug)
        )`);
    }
}