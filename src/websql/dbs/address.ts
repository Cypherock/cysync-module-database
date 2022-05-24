import { Database } from '../module/database';
import Address from '../models/address';

/**
 * AddressDB stores addresses of all wallets across the chain that has ever been encoutered.
 */
export class AddressDB extends Database<Address> {
  constructor() {
    super('address', 'v1');
  }
  public async insert(doc: Address) {
    doc._id = doc.address + doc.walletId;
    await super.insert(doc);
  }
  /**
   * returns a promise which resolves to chainIndex and addressIndex of the given address in the database.
   * If not found, returns null.
   */
  public async getChainIndex(
    address: string,
    walletId: string,
    coinType: string
  ): Promise<{
    chainIndex: number;
    addressIndex: number;
    isSegwit: boolean;
  } | null> {
    const all = await this.getOne({ address, walletId, coinType });
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
