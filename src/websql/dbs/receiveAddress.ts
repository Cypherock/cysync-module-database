import { Database } from '../module/database';
import ReceiveAddress from '../models/receiveAddress';

/**
 * ReceiveAddressDB stores the latest unused receive addresses of a wallet.
 */
export class ReceiveAddressDB extends Database<ReceiveAddress> {
  constructor() {
    super('receiveAddress', { databaseVersion: 'v1' });
  }

  public async insert(doc: ReceiveAddress) {
    doc._id = doc.address + doc.walletId;
    await super.insert(doc);
  }
}