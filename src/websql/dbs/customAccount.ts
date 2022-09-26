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
    const partialData = data.map(dataItem => {
      return JSON.stringify({
        name: dataItem.name,
        coin: dataItem.coin,
        walletId: dataItem.walletId
      });
    });
    const duplicateIndices: number[] = [];
    const filterItems = (item: any) => {
      const partialItem = JSON.stringify({
        name: item.name,
        coin: item.coin,
        walletId: item.walletId
      });
      const index = partialData.findIndex(value => value === partialItem);
      if (index === -1) return true;
      else {
        duplicateIndices.push(index);
        return false;
      }
    };

    const docs = res.docs
      .filter(item => filterItems(item))
      .map(doc => ({
        ...doc,
        _deleted: true
      }));

    await this.db.bulkDocs(docs);
    await this.insertMany(
      data.filter((_, index) => !duplicateIndices.includes(index))
    );

    this.emit('update');
  }
}
