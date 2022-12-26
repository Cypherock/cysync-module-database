import { Database } from '../module/database';
import Token from '../models/token';

/**
 * TokenDB stores the tokens information of a wallet.
 * For example, tokens like USDT, USDC are stored here.
 * For future reference, this database could be extended to store other
 * crypto assets like NFTs.
 */
export class TokenDB extends Database<Token> {
  constructor() {
    super('token', {
      databaseVersion: 'v1',
      indexedFields: [
        'walletId',
        'slug',
        'coin',
        'accountId',
        'coinId',
        'parentCoinId'
      ]
    });
  }

  public async insert(token: Token): Promise<void> {
    token._id = Database.buildIndexString(
      token.walletId,
      token.accountId,
      token.coinId,
      token.parentCoinId,
      token.coin,
      token.slug
    );
    await super.insert(token);
  }

  public async updateBalance(options: {
    coinId: string;
    accountId: string;
    balance: string;
  }) {
    const { coinId, accountId, balance } = options;
    await this.findAndUpdate({ coinId, accountId }, { balance });
  }
}
