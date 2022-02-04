import Service from '../module/database';
import Address from '../models/address';

/**
 * Class for the Address database. This db stores all the addresses with their corresponding xpub,
 * coinType, chainIndex and addressIndex. This class also emits "insert", "delete" event in case of these operations.
 */
export default class AddressDB extends Service<Address> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '') {
    super('addresses', userDataPath, 'v1');
  }

  /**
   * returns a promise which resolves to a list of all addresses in the database.
   */
  public getAll = (
    query?: {
      address?: string;
      xpub?: string;
      coinType?: string;
      chainIndex?: number;
      addressIndex?: number;
      isSegwit?: boolean;
    },
    sorting?: {
      sort: string;
      order?: 'a' | 'd';
    }
  ) => {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    if (sorting) {
      return this.db
        .find(dbQuery)
        .sort({ [sorting.sort]: sorting.order === 'a' ? 1 : -1 })
        .exec();
    }

    return this.db.find(dbQuery).exec();
  };

  /**
   * returns a promise which resolves to chainIndex and addressIndex of the given address in the database.
   * If not found, returns null.
   */
  public getChainIndex = async (
    address: string,
    xpub: string,
    coinType: string
  ): Promise<{
    chainIndex: number;
    addressIndex: number;
    isSegwit: boolean;
  } | null> => {
    const all = await this.db.find({ address, xpub, coinType }).exec();
    if (all.length === 0) {
      return null;
    }

    const { chainIndex, addressIndex, isSegwit } = all[0];

    // Chain Index or address Index -1 means that the data is missing.
    if (
      chainIndex === undefined ||
      addressIndex === undefined ||
      chainIndex === -1 ||
      addressIndex === -1
    ) {
      return null;
    }

    return { chainIndex, addressIndex, isSegwit };
  };

  /**
   * inserts a new Address in the database.
   * @param address - the Address object
   */
  public async insert(address: Address) {
    return this.db
      .update(
        {
          xpub: address.xpub,
          coinType: address.coinType,
          address: address.address
        },
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
  public async delete(address: string) {
    return this.db.remove({ address }).then(() => this.emit('delete'));
  }

  /**
   * deletes all the data from the database.
   */
  public async deleteAll(query?: {
    address?: string;
    xpub?: string;
    coinType?: string;
    chainIndex?: number;
    addressIndex?: number;
    isSegwit?: boolean;
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
