import { Database } from '../module/database';
import ReceiveAddress from '../models/receiveAddress';

export class ReceiveAddressDb extends Database<ReceiveAddress> {
  constructor() {
    super('receiveAddress', 'v1');
  }

  public async insert(doc: ReceiveAddress) {
    doc._id = doc.address + doc.walletId;
    await super.insert(doc);
  }
}
