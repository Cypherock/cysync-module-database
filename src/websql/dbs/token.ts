import { Database } from '../module/database';
import Token from '../models/token';

export class TokenDb extends Database<Token> {
  constructor() {
    super('token', 'v1');
  }

  public async insert(token: Token): Promise<void> {
    token._id = token.slug + token.walletId;
    await super.insert(token);
  }

  public async updateBalance(walletId: string, slug: string, balance: string) {
    await this.findAndUpdate({ walletId, slug }, { balance });
  }
}
