import Service from '../module/database';
import Xpub, { XpubBalance } from '../models/xpub';
import logger from '../utils/logger';
import PassEncrypt from './passHash';

import { PassEncryptError, PassEncryptErrType } from '.';

/**
 * Class for the Xpubs database. This db stores all the xpubs with their last updated balances and their corresponding
 * wallet ID and coin type. This class also emits "insert", "delete", and "update" events in case of these operations.
 */
export default class XpubDB extends Service<Xpub> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '', EnDb: PassEncrypt) {
    super('xpubs', userDataPath, 'v2', EnDb);
    // To remove previously created index
    this.db.removeIndex('xpub').catch(error => {
      logger.error('Error in removing xpub index');
      logger.error(error);
    });
  }

  private async decryptXpub(output: Xpub) {
    if (!this.refEnDb) {
      throw new PassEncryptError(PassEncryptErrType.OBJ_UNDEF);
    }
    output.totalBalance.balance = this.refEnDb.decryptData(
      output.totalBalance.balance
    );
    output.totalBalance.unconfirmedBalance = this.refEnDb.decryptData(
      output.totalBalance.unconfirmedBalance
    );

    output.xpubBalance.balance = this.refEnDb.decryptData(
      output.xpubBalance.balance
    );
    output.xpubBalance.unconfirmedBalance = this.refEnDb.decryptData(
      output.xpubBalance.unconfirmedBalance
    );

    if (output.zpubBalance) {
      output.zpubBalance.balance = this.refEnDb.decryptData(
        output.zpubBalance.balance
      );
      output.zpubBalance.unconfirmedBalance = this.refEnDb.decryptData(
        output.zpubBalance.unconfirmedBalance
      );
    }

    output.xpub = this.refEnDb.decryptData(output.xpub);
    if (output.zpub) {
      output.zpub = this.refEnDb.decryptData(output.zpub);
    }
    return true;
  }

  private async encryptXpub(temp: Xpub) {
    if (!this.refEnDb) {
      throw new PassEncryptError(PassEncryptErrType.OBJ_UNDEF);
    }
    temp.xpubBalance.balance = this.refEnDb.encryptData(
      temp.xpubBalance.balance
    );
    temp.xpubBalance.unconfirmedBalance = this.refEnDb.encryptData(
      temp.xpubBalance.unconfirmedBalance
    );

    if (temp.zpubBalance) {
      temp.zpubBalance.balance = this.refEnDb.encryptData(
        temp.zpubBalance.balance
      );
      temp.zpubBalance.unconfirmedBalance = this.refEnDb.encryptData(
        temp.zpubBalance.unconfirmedBalance
      );
    }

    temp.totalBalance.balance = this.refEnDb.encryptData(
      temp.xpubBalance.balance
    );
    temp.totalBalance.unconfirmedBalance = this.refEnDb.encryptData(
      temp.xpubBalance.unconfirmedBalance
    );

    temp.xpub = this.refEnDb.encryptData(temp.xpub);
    if (temp.zpub) {
      temp.zpub = this.refEnDb.encryptData(temp.zpub);
    }
  }

  public async reEncryptXpub(outputs: Xpub[], passcodeUpdated?: boolean) {
    for (const output of outputs) {
      await this.decryptXpub(output);
      if (passcodeUpdated) {
        const temp: Xpub = { ...output };
        this.encryptXpub(temp);
        await this.db.update(
          { walletId: output.walletId, coin: output.coin },
          {
            $set: {
              xpub: temp.xpub,
              totalBalance: temp.totalBalance,
              zpubBalance: temp.zpubBalance,
              xpubBalance: temp.xpubBalance,
              zpub: temp.zpub
            }
          }
        );
      }
    }
  }

  /**
   * returns a promise which resolves to a list of all xpubs in the database.
   */
  public getAll = async (
    query?: {
      xpub?: string;
      zpub?: string;
      walletId?: string;
      coin?: boolean;
    },
    sorting?: {
      sort: string;
      order?: 'a' | 'd';
    }
  ) => {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    if (sorting) {
      return this.db
        .find(dbQuery)
        .sort({ [sorting.sort]: sorting.order === 'a' ? 1 : -1 })
        .exec();
    }

    const outputs: Xpub[] = await this.db.find(dbQuery).exec();
    try {
      this.reEncryptXpub(outputs);
      return outputs;
    } catch (e) {
      this.deleteAll();
      logger.error(e);
    }
    return null;
  };

  /**
   * returns a promise which resolves to a list of xpubs of a specific coin.
   * @param coin - the coin abbr whose xpubs is to be retrieved
   */
  public getByCoin = async (coin: string) => {
    const outputs: Xpub[] = await this.db.find({ coin }).exec();
    try {
      this.reEncryptXpub(outputs);
      return outputs;
    } catch (e) {
      this.deleteAll();
      logger.error(e);
    }
    return null;
  };

  /**
   * returns a promise which resolves to a list of xpubs from a specific wallet.
   * @param walletId - the ID of the wallet whose xpubs are to be retrieved.
   */
  public async getByWalletId(walletId: string) {
    const outputs: Xpub[] = await this.db.find({ walletId }).exec();
    try {
      this.reEncryptXpub(outputs);
      return outputs;
    } catch (e) {
      this.deleteAll();
      logger.error(e);
    }
    return null;
  }

  /**
   * returns a promise which resolves to an xpub from a specific wallet of a specific coin.
   * @param walletId - the ID of the wallet whose xpub is to be retrieved.
   * @param coin - the coin whose xpub is to be retrieved.
   */
  public async getByWalletIdandCoin(walletId: string, coin: string) {
    const output = await this.db.findOne({ walletId, coin });
    try {
      await this.decryptXpub(output);
      return output;
    } catch (e) {
      logger.error(e);
    }
    return null;
  }

  /**
   * inserts a new xpub in the database.
   * @param xpub - the Xpub object
   */
  public async insert(xpub: Xpub) {
    this.encryptXpub(xpub);

    return this.db
      .update(
        { xpub: xpub.xpub, coin: xpub.coin },
        this.createdDBObject(xpub),
        { upsert: true }
      )
      .then(() => this.emit('insert'));
  }

  /**
   * deletes a xpub object from the database using the xpub.
   * @param xpub - the xpub in base58 format.
   * @param coin - the coin.
   */
  public async delete(xpub: string, coin: string) {
    const tempXpub = this.refEnDb ? this.refEnDb.encryptData(xpub) : xpub;

    return this.db.remove({ tempXpub, coin }).then(() => this.emit('delete'));
  }

  /**
   * deletes all xpubs which correspond to a single wallet.
   * @param walletId
   */
  public async deleteWallet(walletId: string) {
    return this.db
      .remove({ walletId }, { multi: true })
      .then(() => this.emit('delete'));
  }

  /**
   * deletes all the data from the database.
   */
  public async deleteAll() {
    return this.db.remove({}, { multi: true }).then(() => this.emit('delete'));
  }

  /**
   * To upload arbitrary data required by the xpub
   * Example internal / external online wallet names for blockcypher
   * address index for ethereum wallet
   *
   * @param xpub - the xpub in base58 format.
   * @param coin - the coin to be changed.
   * @param data - the data to be added.
   */
  public async updateByXpub(xpub: string, coin: any, data: any) {
    let tempXpub = xpub;
    if (this.refEnDb) {
      tempXpub = this.refEnDb.encryptData(xpub);
    }
    return this.db
      .update({ tempXpub, coin }, { $set: data })
      .then(() => this.emit('update'));
  }

  /**
   * updates the balance for a xpub.
   * @param xpub - the xpub in base58 format.
   * @param coin - the coin.
   * @param balance - the balance object.
   */

  public async updateBalance(xpub: string, coin: string, balance: XpubBalance) {
    let tempXpub = xpub;
    if (this.refEnDb) {
      tempXpub = this.refEnDb.encryptData(xpub);
      balance.balance = this.refEnDb.encryptData(balance.balance);
      balance.unconfirmedBalance = this.refEnDb.encryptData(
        balance.unconfirmedBalance
      );
    }

    return this.db
      .update({ tempXpub, coin }, { $set: { xpubBalance: balance } })
      .then(() => this.emit('update'));
  }

  /**
   * updates the balance for a xpub.
   * @param xpub - the xpub in base58 format.
   * @param coin - the coin.
   * @param balance - the balance object.
   */
  public async updateZpubBalance(
    xpub: string,
    coin: string,
    balance: XpubBalance
  ) {
    let tempXpub = xpub;
    if (this.refEnDb) {
      tempXpub = this.refEnDb.encryptData(xpub);
      balance.balance = this.refEnDb.encryptData(balance.balance);
      balance.unconfirmedBalance = this.refEnDb.encryptData(
        balance.unconfirmedBalance
      );
    }

    return this.db
      .update({ tempXpub, coin }, { $set: { zpubBalance: balance } })
      .then(() => this.emit('update'));
  }

  /**
   * updates the balance for a xpub.
   * @param xpub - the xpub in base58 format.
   * @param coin - the coin.
   * @param balance - the balance object.
   */
  public async updateTotalBalance(
    xpub: string,
    coin: string,
    balance: XpubBalance
  ) {
    let tempXpub = xpub;
    if (this.refEnDb) {
      tempXpub = this.refEnDb.encryptData(xpub);
      balance.balance = this.refEnDb.encryptData(balance.balance);
      balance.unconfirmedBalance = this.refEnDb.encryptData(
        balance.unconfirmedBalance
      );
    }

    return this.db
      .update({ tempXpub, coin }, { $set: { totalBalance: balance } })
      .then(() => this.emit('update'));
  }
}
