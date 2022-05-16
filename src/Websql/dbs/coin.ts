import { Database } from '../module/database';
import Coin from '../models/coin';
import { PassEncrypt } from '.';
import { ISENCRYPTED } from '../models/model';

export class CoinDb extends Database<Coin> {
  constructor(enDb?: PassEncrypt) {
    super('coin', 'v1', enDb);
    this.secretFields = ['xpub', 'zpub'];
  }

  public async insert(coin: Coin) {
    coin._id = coin.slug + coin.walletId;
    coin.isEncrypted = ISENCRYPTED.NO;
    await super.insert(coin);
  }

  public async updateXpubBalance(
    xpub: string,
    slug: string,
    xpubBalance: string,
    xpubUnconfirmedBalance: string
  ): Promise<void> {
    await this.findAndUpdate(
      { xpub, slug },
      { xpubBalance, xpubUnconfirmedBalance }
    );
  }
  public async updateZpubBalance(
    zpub: string,
    slug: string,
    zpubBalance: string,
    zpubUnconfirmedBalance: string
  ): Promise<void> {
    await this.findAndUpdate(
      { zpub, slug },
      { zpubBalance, zpubUnconfirmedBalance }
    );
  }
  public async updateTotalBalance(
    xpub: string,
    slug: string,
    totalBalance: string,
    totalUnconfirmedBalance: string
  ): Promise<void> {
    await this.findAndUpdate(
      { xpub, slug },
      { totalBalance, totalUnconfirmedBalance }
    );
  }
}