import { Database } from '../module/database';
import Address from '../models/address';

/**
 * AddressDB stores addresses of all wallets across the chain that has ever been encoutered.
 */
export class AddressDB extends Database<Address> {
  constructor() {
    super('address', {
      databaseVersion: 'v2',
      indexedFields: ['walletId', 'accountId', 'coinId', 'address']
    });
  }

  public buildIndex(doc: Address) {
    return Database.buildIndexString(doc.accountId, doc.address);
  }

  public async insert(doc: Address) {
    doc._id = this.buildIndex(doc);
    await super.insert(doc);
  }

  public async insertMany(docs: Address[]): Promise<void> {
    await super.insertMany(
      docs.map(doc => ({
        ...doc,
        databaseVersion: this.databaseVersion,
        _id: this.buildIndex(doc)
      }))
    );
  }

  /**
   * returns a promise which resolves to chainIndex and addressIndex of the given address in the database.
   * If not found, returns null.
   */
  public async getChainIndex(options: {
    address: string;
    accountId: string;
  }): Promise<{
    chainIndex: number;
    addressIndex: number;
    isSegwit: boolean;
  } | null> {
    const { address, accountId } = options;
    const all = await this.getOne({ address, accountId });
    if (!all) {
      return null;
    }

    const { chainIndex, addressIndex, isSegwit } = all;

    // Chain Index or address Index -1 means that the data is missing.
    if (
      chainIndex === undefined ||
      addressIndex === undefined ||
      chainIndex === -1 ||
      addressIndex === -1
    ) {
      return null;
    }

    return { chainIndex, addressIndex, isSegwit: isSegwit === true };
  }
}
