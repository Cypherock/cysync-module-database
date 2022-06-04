import { Database } from '../module/database';
import Coin from '../models/coin';
import { PassEncrypt } from '.';
import { IS_ENCRYPTED } from '../models/model';

/**
 * CoinDB stores the native currency(coin) of a network.
 * For example, ETH is the native currency of Ethereum.
 * USDT, USDC are not meant to be stored here. Use TokenDB instead.
 */
export class CoinDB extends Database<Coin> {
  constructor(enDb?: PassEncrypt) {
    super('coin', {
      databaseVersion: 'v1',
      enDb,
      indexedFields: ['walletId', 'slug']
    });
    this.secretFields = ['xpub', 'zpub'];
  }

  public async insert(coin: Coin) {
    coin._id = this.buildIndexString(coin.slug, coin.walletId);
    coin.isEncrypted = IS_ENCRYPTED.NO;
    await super.insert(coin);
  }

  public async updateXpubBalance(options: {
    xpub: string;
    slug: string;
    xpubBalance: string;
    xpubUnconfirmedBalance: string;
  }): Promise<void> {
    const { xpub, slug, xpubBalance, xpubUnconfirmedBalance } = options;
    await this.findAndUpdate(
      { xpub, slug },
      { xpubBalance, xpubUnconfirmedBalance }
    );
  }
  public async updateZpubBalance(options: {
    zpub: string;
    slug: string;
    zpubBalance: string;
    zpubUnconfirmedBalance: string;
  }): Promise<void> {
    const { zpub, slug, zpubBalance, zpubUnconfirmedBalance } = options;
    await this.findAndUpdate(
      { zpub, slug },
      { zpubBalance, zpubUnconfirmedBalance }
    );
  }
  public async updateTotalBalance(options: {
    xpub: string;
    slug: string;
    totalBalance: string;
    totalUnconfirmedBalance: string;
  }): Promise<void> {
    const { xpub, slug, totalBalance, totalUnconfirmedBalance } = options;
    await this.findAndUpdate(
      { xpub, slug },
      { totalBalance, totalUnconfirmedBalance }
    );
  }

  public async delete(query: Partial<Coin>): Promise<void> {
    await super.deleteTruly(query);
  }
}
