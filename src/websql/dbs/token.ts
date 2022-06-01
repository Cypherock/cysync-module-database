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
    super('token', { databaseVersion: 'v1' });
  }

  public async insert(token: Token): Promise<void> {
    token._id = this.buildIndexString(token.slug, token.coin, token.walletId);
    await super.insert(token);
  }

  public async updateBalance(options: {
    walletId: string;
    slug: string;
    balance: string;
  }) {
    const { walletId, slug, balance } = options;
    await this.findAndUpdate({ walletId, slug }, { balance });
  }
}
