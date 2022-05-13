import { Db } from '../module2/database2';
import SendAddress from '../models2/sendAddress';

export class SendAddressDb extends Db<SendAddress> {
  constructor() {
    super('sendAddress');
  }
  public async insert(doc: SendAddress) {
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

    return { chainIndex, addressIndex, isSegwit: isSegwit == true };
  }
}
