import Service from '../module/database';
import LatestPrice from '../models/latestPrice';

/**
 * Class for the Latest Price Database. It stores the latest prices of all coins used in the application such as all BTC forks, eth, etc.
 *
 * @extends Service
 */
class LatestPriceDB extends Service<LatestPrice> {
  /**
   * Calls the super constructor with the database name and the base URL to fetch the price
   * (Could be cypherock server, or any other server)
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
          price: price
        }),
        { upsert: true }
      )
      .then(() => this.emit('insert'));
  }

  /**
   * Returns the price for a coin from the database.
   *
   * @param coin - coin abbr
   * @param days - number of days, from {7, 30, 365}
   */
  getPrice(coin = 'btc') {
    return this.db.findOne({ coin });
  }
}

export default LatestPriceDB;
