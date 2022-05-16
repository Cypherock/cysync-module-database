import Service from '../module/database';
import Price from '../models/price';

/**
 * Class for the Price Database. It stores the prices of all coins used in the application such as all BTC forks, eth, etc.
 *
 * @extends Service
 */
class PriceDB extends Service<Price> {
  /**
   * Calls the super constructor with the database name and the base URL to fetch the price
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '') {
    super('coinPrices', userDataPath, 'v1');
  }

  public getAll() {
    return this.db.find({}).exec();
  }

  /**
   * Inserts a new price to the database.
   */
  public async insert(
    coinType: Price['coin'],
    days: Price['days'],
    entries: Price['data']
  ) {
    return this.db
      .update(
        { coin: coinType, days },
        this.createdDBObject({
          coin: coinType,
          days,
          data: entries
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
  getPrice(coin = 'btc', days = 7) {
    return this.db.findOne({ coin, days });
  }
}

export default PriceDB;
