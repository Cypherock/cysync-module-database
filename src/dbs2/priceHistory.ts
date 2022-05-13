import { Db } from '../module2/database2';
import PriceHistory from '../models2/priceHistory';

/**
 * Class for the Price Database. It stores the prices of all coins used in the application such as all BTC forks, eth, etc.
 *
 * @extends Db
 */
export default class PriceHistoryDb extends Db<PriceHistory> {
  /**
   * Calls the super constructor with the database name and the base URL to fetch the price
   * (Could be cypherock server, or any other server)
   */
  constructor() {
    super('priceHistory');
  }

  /**
   * Inserts a new price to the database.
   */
  public async insert(priceHistory: PriceHistory) {
    priceHistory._id = priceHistory.slug + priceHistory.interval;
    await this.db.put(priceHistory);
  }
}