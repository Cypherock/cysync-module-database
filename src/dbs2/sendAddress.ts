import { Db } from '../module2/database';
import SendAddress from '../models2/sendAddress';

export class SendAddressDb extends Db<SendAddress> {
  constructor() {
    super('sendAddress');
    this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            address TEXT NOT NULL,
            walletId TEXT NOT NULL,
            coinType TEXT NOT NULL,
            chainIndex INTEGER NOT NULL,
            addressIndex INTEGER NOT NULL,
            isSegwit BOOL NOT NULL,
            bipType INTEGER,
            PRIMARY KEY (address)
        )`);
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
    const all = await this.getAll({ address, walletId, coinType });
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

    return { chainIndex, addressIndex, isSegwit: isSegwit == true };
  }
}
