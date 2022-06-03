import { Database } from '../module/database';
import PriceHistory from '../models/priceHistory';

/**
 * PriceHistoryDB stores the prices history of all currencies(coins+tokens) on
 * intervals of 1 week, 1 month and 1 year. The portfolio graph is built using
 * the data points stored in PriceHistoryDB.
 */
export default class PriceHistoryDB extends Database<PriceHistory> {
  /**
   * Calls the super constructor with the database name and the base URL to fetch the price
   * (Could be cypherock server, or any other server)
   */
  constructor() {
    super('priceHistory', { databaseVersion: 'v1', indexedFields: ['slug'] });
  }

  /**
   * Inserts a new price to the database.
   */
  public async insert(priceHistory: PriceHistory) {
    priceHistory._id = this.buildIndexString(
      priceHistory.slug,
      priceHistory.interval
    );
    await super.insert(priceHistory);
  }
}
