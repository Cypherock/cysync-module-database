import { Database } from '../module/database';
import CoinPrice from '../models/coinPrice';

export class CoinPriceDB extends Database<CoinPrice> {
  constructor() {
    super('coinPrice', {
      databaseVersion: 'v1',
      indexedFields: ['coinId']
    });
  }

  public async insert(coin: CoinPrice) {
    coin._id = Database.buildIndexString(coin.coinId);
    await super.insert(coin);
  }
}
