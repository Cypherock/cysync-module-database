import { Db } from '../module2/database2';
import ReceiveAddress from '../models2/receiveAddress';

export class ReceiveAddressDb extends Db<ReceiveAddress> {
  constructor() {
    super('receiveAddress', 'v1');
  }

  public async insert(doc: ReceiveAddress) {
    doc._id = doc.address + doc.walletId;
    await super.insert(doc);
  }
}
