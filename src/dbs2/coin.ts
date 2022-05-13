import { Db } from '../module2/database2';
import Coin from '../models2/coin';
import { PassEncrypt } from '../dbs2';

export class CoinDb extends Db<Coin> {
  constructor(enDb?: PassEncrypt) {
    super('coin', enDb);
  }

  // private decrypt(doc: Coin): Coin {
  //   if (this.refEnDb) {
  //     if (doc?.xpub) {
  //       doc.xpub = this.refEnDb.decryptData(doc.xpub);
  //     }
  //     if (doc?.zpub) {
  //       doc.zpub = this.refEnDb.decryptData(doc.zpub);
  //     }
  //   }
  //   doc.isEncrypted = 0;
  //   return doc;
  // }

  // private encrypt(doc: Coin): Coin {
  //   if (this.refEnDb) {
  //     if (doc?.xpub) {
  //       doc.xpub = this.refEnDb.encryptData(doc.xpub);
  //     }
  //     if (doc?.zpub) {
  //       doc.zpub = this.refEnDb.encryptData(doc.zpub);
  //     }
  //   }
  //   doc.isEncrypted = 1;
  //   return doc;
  // }

  public async insert(coin: Coin) {
    coin._id = coin.slug + coin.walletId;
    await super.insert(coin);
  }


  // public async encryptSecrets(singleHash: string): Promise<void> {
  //   const coins = await this.getAll({ isEncrypted: 0 });
  //   if (coins.length > 0) {
  //     this.refEnDb?.setPassHash(singleHash);
  //     const encryptedCoins = coins.map(coin => this.encrypt(coin));
  //     await this.delete({ isEncrypted: 0 });
  //     await this.insertMany(encryptedCoins);
  //   }
  // }

  // public async decryptSecrets(): Promise<void> {
  //   const coins = await this.getAll({ isEncrypted: 1 });
  //   if (coins.length > 0) {
  //     this.refEnDb?.destroyHash();
  //     const decryptedCoins = coins.map(coin => this.decrypt(coin));
  //     await this.delete({ isEncrypted: 1 });
  //     await this.insertMany(decryptedCoins);
  //   }
  // }

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
