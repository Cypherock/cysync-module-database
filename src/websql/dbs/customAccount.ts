import { Database } from '../module/database';
import CustomAccount from '../models/customAccount';

/**
 * CustomAccountDB stores the custom account information of near coin of a wallet.
 * For example, registerd accounts like testingnet.testnet or accountname.near
 * For future reference, this database could be extended to store other
 * custom accounts for other coins as well.
 */
export class CustomAccountDB extends Database<CustomAccount> {
  constructor() {
    super('customAccount', {
      databaseVersion: 'v1',
      indexedFields: ['walletId', 'name', 'coin']
    });
  }

  public async insert(account: CustomAccount): Promise<void> {
    account._id = this.buildIndexString(
      account.walletId,
      account.coin,
      account.name
    );
    await super.insert(account);
  }

  public async updateBalance(options: {
    walletId: string;
    name: string;
    balance: string;
  }) {
    const { walletId, name, balance } = options;
    await this.findAndUpdate({ walletId, name }, { balance });
  }

  public async rebuild(data: CustomAccount[], query: Partial<CustomAccount>) {
    const res = await this.db.find({ selector: query });
    console.log(res);
    const docs = res.docs.map(doc => ({
      ...doc,
      _deleted: true
    }));
    console.log(docs);
    await this.db.bulkDocs(docs);

    console.log(data);
    const deleteFilter = (doc: { _deleted: any }, _: any) => !doc._deleted;
    await this.syncAndResync(undefined, deleteFilter);

    this.insertMany(data);

    this.emit('update');
  }
}
