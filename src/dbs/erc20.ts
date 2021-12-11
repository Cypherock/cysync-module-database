import Service from '../module/database';
import ERC20 from '../models/erc20token';
import ERC20Token from '../models/erc20token';
import { XpubDB } from '.';

/**
 * Class for the Erc20 database. This db stores all the erc20 tokens with their last updated balances and their corresponding
 * wallet ID and token type. This class also emits "insert", "delete", and "update" events in case of these operations.
 */
export default class Erc20DB extends Service<ERC20> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '') {
    super('erc20', userDataPath, 'v1');
  }

  /**
   * returns a promise which resolves to a list of all tokens in the database.
   * @param query - query params to search database
   * @param sorting - sorting option order a : ascending | d : descending
   */
  public getAll(
    query?: {
      walletId?: string;
      coin?: string;
      ethCoin?: string;
      balance?: string;
    },
    sorting?: {
      sort: string;
      order?: 'a' | 'd';
    }
  ) {
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
  }

  /**
   * returns a promise which resolves to a list of tokens of a specific coin.
   * @param coin - the token abbr whose tokens are to be retrieved
   */
  public getByToken = (token: string) => {
    return this.db.find({ coin: token }).exec();
  };

  /**
   * returns a promise which resolves to a list of tokens from a specific wallet.
   * @param walletId - the ID of the wallet whose tokens are to be retrieved.
   */
  public getByWalletId(walletId: string, ethCoin: string) {
    return this.db.find({ walletId, ethCoin }).exec();
  }

  /**
   * returns a promise which resolves to a token from a specific wallet of a specific coin.
   * @param walletId - the ID of the wallet whose token is to be retrieved.
   * @param coin - the coin whose token is to be retrieved.
   */
  public getByWalletIdandToken(walletId: string, coin: string) {
    return this.db.findOne({ walletId, coin });
  }

  /**
   * gets token which corresponds to a single coin
   */
  public getOne(query?: {
    walletId?: string;
    coin?: string;
    ethCoin?: string;
    balance?: string;
  }) {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    return this.db.findOne(dbQuery);
  }

  /**
   * inserts a new token in the database.
   * @param xpub - the Xpub object
   */
  public insert(token: ERC20Token) {
    return this.db
      .update(
        { walletId: token.walletId, coin: token.coin, ethCoin: token.ethCoin },
        this.createdDBObject(token),
        {
          upsert: true
        }
      )
      .then(() => this.emit('insert'));
  }

  /**
   * deletes all tokens which correspond to a single wallet.
   * @param walletId
   */
  public deleteWallet(walletId: string) {
    return this.db
      .remove({ walletId }, { multi: true })
      .then(() => this.emit('delete'));
  }

  /**
   * deletes all the data from the database.
   */
  public deleteAll(query?: {
    walletId?: string;
    coin?: string;
    ethCoin?: string;
    balance?: string;
  }) {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    return this.db
      .remove(dbQuery, { multi: true })
      .then(() => this.emit('delete'));
  }

  /**
   * updates the balance for a token.
   * @param coin - the token name format.
   * @param walletId - the id of the wallet.
   * @param balance - the balance object.
   */
  public updateBalance(coin: string, walletId: string, balance: string) {
    return this.db
      .update({ coin, walletId }, { $set: { balance } })
      .then(() => this.emit('update'));
  }
}
