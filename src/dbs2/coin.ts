import { Db } from '../module2/database';
import Coin from '../models2/coin';
import { PassEncrypt } from '../dbs';

export class CoinDb extends Db<Coin> {
  constructor(enDb?: PassEncrypt) {
    super('coin', enDb);
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
            isEncrypted INTEGER DEFAULT 0,
            PRIMARY KEY (walletId, slug)
        )`);
  }

  private decrypt(doc: Coin): Coin {
    if (this.refEnDb) {
      if (doc?.xpub) {
        doc.xpub = this.refEnDb.decryptData(doc.xpub);
      }
      if (doc?.zpub) {
        doc.zpub = this.refEnDb.decryptData(doc.zpub);
      }
    }
    doc.isEncrypted = 0;
    return doc;
  }

  private encrypt(doc: Coin): Coin {
    if (this.refEnDb) {
      if (doc?.xpub) {
        doc.xpub = this.refEnDb.encryptData(doc.xpub);
      }
      if (doc?.zpub) {
        doc.zpub = this.refEnDb.encryptData(doc.zpub);
      }
    }
    doc.isEncrypted = 1;
    return doc;
  }

  public async getOne(query: Partial<Coin>): Promise<Coin | null> {
    const response = await super.getOne(query);
    if (response) return this.decrypt(response);
    return response;
  }

  public async getAll(
    query?: Partial<Coin>,
    sorting?: {
      sort: string;
      order?: 'asc' | 'desc';
      limit?: number;
    },
    andQuery?: string,
    andQueryValues?: any[]
  ): Promise<Coin[]> {
    const response = await super.getAll(
      query,
      sorting,
      andQuery,
      andQueryValues
    );
    return response.map((doc: Coin) => this.decrypt(doc));
  }

  public async encryptSecrets(singleHash: string): Promise<void> {
    const coins = await this.getAll({ isEncrypted: 0 });
    if (coins.length > 0) {
      this.refEnDb?.setPassHash(singleHash);
      const encryptedCoins = coins.map(coin => this.encrypt(coin));
      await this.delete({ isEncrypted: 0 });
      await this.insertMany(encryptedCoins);
    }
  }

  public async decryptSecrets(): Promise<void> {
    const coins = await this.getAll({ isEncrypted: 1 });
    if (coins.length > 0) {
      this.refEnDb?.destroyHash();
      const decryptedCoins = coins.map(coin => this.decrypt(coin));
      await this.delete({ isEncrypted: 1 });
      await this.insertMany(decryptedCoins);
    }
  }

  public async updateXpubBalance(
    xpub: string,
    slug: string,
    xpubBalance: string,
    xpubUnconfirmedBalance: string
  ): Promise<void> {
    await this.executeSql(
      `UPDATE ${this.table} SET xpubBalance = ?, xpubUnconfirmedBalance = ? WHERE xpub = ? and slug = ?`,
      [xpubBalance, xpubUnconfirmedBalance, xpub, slug]
    );
    this.emit('update');
  }
  public async updateZpubBalance(
    zpub: string,
    slug: string,
    zpubBalance: string,
    zpubUnconfirmedBalance: string
  ): Promise<void> {
    await this.executeSql(
      `UPDATE ${this.table} SET zpubBalance = ?, zpubUnconfirmedBalance = ? WHERE zpub = ? and slug = ?`,
      [zpubBalance, zpubUnconfirmedBalance, zpub, slug]
    );
    this.emit('update');
  }
  public async updateTotalBalance(
    xpub: string,
    slug: string,
    totalBalance: string,
    totalUnconfirmedBalance: string
  ): Promise<void> {
    await this.executeSql(
      `UPDATE ${this.table} SET totalBalance = ?, totalUnconfirmedBalance = ? WHERE xpub = ? and slug = ?`,
      [totalBalance, totalUnconfirmedBalance, xpub, slug]
    );
    this.emit('update');
  }
}
