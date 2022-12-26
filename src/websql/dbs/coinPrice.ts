import { Database } from '../module/database';
import CoinPrice from '../models/coinPrice';

/**
 * CoinDB stores the native currency(coin) of a network.
 * For example, ETH is the native currency of Ethereum.
 * USDT, USDC are not meant to be stored here. Use TokenDB instead.
 */
export class CoinPriceDB extends Database<CoinPrice> {
  constructor() {
    super('coinPrice', {
      databaseVersion: 'v1',
      indexedFields: ['coin', 'slug', 'coinId']
    });
  }

  public async insert(coin: CoinPrice) {
    coin._id = Database.buildIndexString(coin.coinId);
    await super.insert(coin);
  }
}
