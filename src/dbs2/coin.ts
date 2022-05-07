import { Db } from '../module2/database';
import Coin from '../models2/coin';

export class CoinDb extends Db<Coin> {

    constructor() {
        super('device');
        this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            walletId TEXT NOT NULL,
            networkId INTEGER,
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
            PRIMARY KEY (walletId, slug)
        )`);
    }

    public async updateXpubBalance(xpub: string, slug: string, xpubBalance: string, xpubUnconfirmedBalance: string): Promise<void> {
        await this.executeSql(`UPDATE ${this.table} SET xpubBalance = ?, xpubUnconfirmedBalance = ? WHERE xpub = ? and slug = ?`, [xpubBalance, xpubUnconfirmedBalance, xpub, slug]);
        this.emit('update');
    }
    public async updateZpubBalance(zpub: string, slug: string, zpubBalance: string, zpubUnconfirmedBalance: string): Promise<void> {
        await this.executeSql(`UPDATE ${this.table} SET zpubBalance = ?, zpubUnconfirmedBalance = ? WHERE zpub = ? and slug = ?`, [zpubBalance, zpubUnconfirmedBalance, zpub, slug]);
        this.emit('update');
    }
    public async updateTotalBalance(walletId: string, slug: string, totalBalance: string, totalUnconfirmedBalance: string): Promise<void> {
        await this.executeSql(`UPDATE ${this.table} SET totalBalance = ?, totalUnconfirmedBalance = ? WHERE walletId = ? and slug = ?`, [totalBalance, totalUnconfirmedBalance, walletId, slug]);
        this.emit('update');
    }
}