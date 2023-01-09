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
      databaseVersion: 'v2',
      indexedFields: ['walletId', 'name', 'accountId', 'coinId']
    });
  }

  public async insert(account: CustomAccount): Promise<void> {
    account._id = Database.buildIndexString(
      account.walletId,
      account.coin,
      account.name,
      account.accountId,
      account.coinId
    );
    await super.insert(account);
  }

  public async updateBalance(options: {
    accountId: string;
    name: string;
    balance: string;
  }) {
    const { accountId, name, balance } = options;
    await this.findAndUpdate({ accountId, name }, { balance });
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
