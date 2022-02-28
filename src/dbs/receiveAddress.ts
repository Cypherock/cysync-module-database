import Service from '../module/database';
import ReceiveAddress from '../models/receiveAddress';

/**
 * Class for the Receive Address database. This db stores all the latest addresses with their corresponding xpub,
 * coinType. This class also emits "insert", "delete" event in case of these operations.
 */
export default class ReceiveAddressDB extends Service<ReceiveAddress> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '') {
    super('receiveAddresses', userDataPath, 'v1');
  }

  /**
   * returns a promise which resolves to a list of all addresses in the database.
   */
  public getAll = () => {
    return this.db.find({}).exec();
  };

  /**
   * inserts a new Address in the database.
   * @param address - the Address object
   */
  public insert(address: ReceiveAddress) {
    return this.db
      .update(
        { walletId: address.walletId, coinType: address.coinType },
        this.createdDBObject(address),
        {
          upsert: true
        }
      )
      .then(() => this.emit('insert'));
  }

  /**
   * deletes an Address object from the database using the address.
   * @param address - the address
   */
  public delete(address: string) {
    return this.db.remove({ address }).then(() => this.emit('delete'));
  }

  /**
   * deletes all the data from the database.
   */
  public deleteAll(query?: {
    walletId?: string;
    address?: string;
    coinType?: string;
  }) {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    return this.db
      .remove(dbQuery, { multi: true })
      .then(() => this.emit('delete'));
  }
}
