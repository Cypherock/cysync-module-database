import Service from '../module/database';
import LatestPrice from '../models/latestPrice';

/**
 * Class for the Latest Price Database. It stores the latest prices of all coins used in the application such as all BTC forks, eth, etc.
 *
 * @extends Service
 */
class LatestPriceDB extends Service<LatestPrice> {
  /**
   * Calls the super constructor with the database name and the base URL to fetch the latest price
   * @param userDataPath - path to the user data folder
   */
  constructor(userDataPath = '') {
    super('latestCoinPrices', userDataPath, 'v1');
  }

  public getAll() {
    return this.db.find({}).exec();
  }

  /**
   * Inserts a new latest price to the database.
   */
  public async insert(
    coinType: LatestPrice['coin'],
    price: LatestPrice['price']
  ) {
    return this.db
      .update(
        { coin: coinType },
        this.createdDBObject({
          coin: coinType,
          price
        }),
        { upsert: true }
      )
      .then(() => this.emit('insert'));
  }

  /**
   * Returns the price for a coin from the database.
   *
   * @param coin - coin abbreviation
   *
   * @returns the latest price for the coin
   */
  getPrice(coin: LatestPrice['coin']) {
    return this.db.findOne({ coin });
  }
}

export default LatestPriceDB;
