import Service from '../module/database';
import Xpub, { XpubBalance } from '../models/xpub';
import logger from '../utils/logger';
import PassEncrypt from './passHash';
import { DatabaseError,DatabaseErrType } from '../errors';
/**
 * Class for the Xpubs database. This db stores all the xpubs with their last updated balances and their corresponding
 * wallet ID and coin type. This class also emits "insert", "delete", and "update" events in case of these operations.
 */
export default class XpubDB extends Service<Xpub> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '', enDb: PassEncrypt) {
    super('xpubs', userDataPath, 'v2', enDb);
    
    if (!enDb) {
      throw new DatabaseError(DatabaseErrType.OBJ_UNDEF);
    }
    
    // To remove previously created index
    this.db.removeIndex('xpub').catch(error => {
      logger.error('Error in removing xpub index');
      logger.error(error);
    });
  }

  public async updateAll(outputs: Xpub[]) {
    for (const output of outputs) {
      await this.db.update(
        { walletId: output.walletId, coin: output.coin },
        {
          $set: {
            ...output
          }
        }
      );
    }
  }

  /**
   * returns a promise which resolves to a list of all xpubs in the database.
   */
  public getAll = (
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

    return this.db.find(dbQuery).exec();
  };

  /**
   * returns a promise which resolves to a list of xpubs of a specific coin.
   * @param coin - the coin abbr whose xpubs is to be retrieved
   */
  public getByCoin = (coin: string) => {
    return this.db.find({ coin }).exec();
  };

  /**
   * returns a promise which resolves to a list of xpubs from a specific wallet.
   * @param walletId - the ID of the wallet whose xpubs are to be retrieved.
   */
  public getByWalletId(walletId: string) {
    return this.db.find({ walletId }).exec();
  }

  /**
   * returns a promise which resolves to an xpub from a specific wallet of a specific coin.
   * @param walletId - the ID of the wallet whose xpub is to be retrieved.
   * @param coin - the coin whose xpub is to be retrieved.
   */
  public getByWalletIdandCoin(walletId: string, coin: string) {
    return this.db.findOne({ walletId, coin });
  }

  /**
   * inserts a new xpub in the database.
   * @param xpub - the Xpub object
   */
  public async insert(xpub: Xpub) {
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
    return this.db.remove({ xpub, coin }).then(() => this.emit('delete'));
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
    return this.db
      .update({ xpub, coin }, { $set: data })
      .then(() => this.emit('update'));
  }

  /**
   * updates the balance for a xpub.
   * @param xpub - the xpub in base58 format.
   * @param coin - the coin.
   * @param balance - the balance object.
   */

  public async updateBalance(xpub: string, coin: string, balance: XpubBalance) {
    return this.db
      .update({ xpub, coin }, { $set: { xpubBalance: balance } })
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
    return this.db
      .update({ xpub, coin }, { $set: { zpubBalance: balance } })
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
    return this.db
      .update({ xpub, coin }, { $set: { totalBalance: balance } })
      .then(() => this.emit('update'));
  }
}
