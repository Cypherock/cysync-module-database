import {
  COINS,
  BtcCoinData,
  BitcoinAccountTypeDetails,
  SolanaCoinData,
  SolanaAccountTypeDetails
} from '@cypherock/communication';
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

  public static createAccountName(account: Account) {
    const coin = COINS[account.coinId];

    let additionalName = '';

    if (account.accountType) {
      if (coin instanceof BtcCoinData) {
        const accountType = BitcoinAccountTypeDetails[account.accountType];
        if (!accountType) {
          throw new Error(
            'Invalid accountType in accountDb: ' + account.accountType
          );
        }

        additionalName += accountType.tag;
      } else if (coin instanceof SolanaCoinData) {
        const accountType = SolanaAccountTypeDetails[account.accountType];
        if (!accountType) {
          throw new Error(
            'Invalid accountType in accountDb: ' + account.accountType
          );
        }

        additionalName += accountType.tag;
      } else {
        throw new Error(
          'Invalid accountType in accountDb: ' + account.accountType
        );
      }
    }

    if (account.accountIndex && account.accountIndex !== 0) {
      if (additionalName) {
        additionalName += ' ';
      }

      additionalName += account.accountIndex;
    }

    if (additionalName) {
      return `${coin.name} ${additionalName}`;
    }

    return coin.name;
  }

  public async insert(account: Account) {
    account.accountId = AccountDB.buildAccountIndex(account);
    account.name = AccountDB.createAccountName(account);
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
