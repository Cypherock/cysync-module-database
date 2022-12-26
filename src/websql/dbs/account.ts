import crypto from 'crypto';
import { Database } from '../module/database';
import Account from '../models/account';
import { PassEncrypt } from '.';
import { IS_ENCRYPTED } from '../models/model';

export class AccountDB extends Database<Account> {
  constructor(enDb?: PassEncrypt) {
    super('account', {
      databaseVersion: 'v1',
      enDb,
      indexedFields: [
        'walletId',
        'slug',
        'accountId',
        'coinId',
        'accountType',
        'accountIndex'
      ]
    });
    this.secretFields = ['xpub'];
  }

  private static hash(str: string) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  public static buildAccountIndex(account: Account) {
    return this.buildIndexString(
      account.walletId,
      account.coinId,
      this.hash(account.xpub),
      account.accountType || '',
      account.accountIndex
    );
  }

  public async insert(account: Account) {
    account.accountId = AccountDB.buildAccountIndex(account);
    account._id = account.accountId;
    account.isEncrypted = IS_ENCRYPTED.NO;
    await super.insert(account);
  }

  public async updateBalance(options: {
    accountId: string;
    totalBalance: string;
    totalUnconfirmedBalance: string;
  }): Promise<void> {
    const { accountId, totalBalance, totalUnconfirmedBalance } = options;
    await this.findAndUpdate(
      { accountId },
      { totalBalance, totalUnconfirmedBalance }
    );
  }

  public async delete(query: Partial<Account>): Promise<void> {
    await super.deleteTruly(query);
  }
}