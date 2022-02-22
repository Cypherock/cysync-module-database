import Service from '../module/database';
import ERC20 from '../models/erc20token';
import ERC20Token from '../models/erc20token';
import PassEncrypt from "./passHash";
import logger from '../utils/logger';

/**
 * Class for the Erc20 database. This db stores all the erc20 tokens with their last updated balances and their corresponding
 * wallet ID and token type. This class also emits "insert", "delete", and "update" events in case of these operations.
 */
export default class Erc20DB extends Service<ERC20> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '', enDb:PassEncrypt) {
    super('erc20', userDataPath, 'v1', enDb);
  }

  public updatePostEn(output:ERC20){
    if(!this.refEnDb){
      return false;
    }
    output.balance = this.refEnDb.decryptData(output.balance);
    return true;
  }

  public async updatePostEnAll(outputs:ERC20[], flag?:boolean){
    for(let output of outputs){
      if(!this.updatePostEn(output)){
        throw "ref enDb is not defined";
      }
      if(flag){
        await this.db.update({walletId:output.walletId, coin:output.coin, ethCoin:output.ethCoin}, {$set: {balance:this.refEnDb? this.refEnDb.encryptData(output.balance):output.balance}});
      }
    }
    return outputs;
  }

  /**
   * returns a promise which resolves to a list of all tokens in the database.
   * @param query - query params to search database
   * @param sorting - sorting option order a : ascending | d : descending
   */
  public async getAll(
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
    let outputs = await this.db.find(dbQuery).exec();

    try{
      this.updatePostEnAll(outputs);
      return outputs;
     }catch(e){
       logger.error(e);
     }
     return outputs;
  }

  /**
   * returns a promise which resolves to a list of tokens of a specific coin.
   * @param coin - the token abbr whose tokens are to be retrieved
   */
  public getByToken = async (token: string) => {
    let outputs = await this.db.find({ coin: token }).exec();
    try{
      this.updatePostEnAll(outputs);
      return outputs;
     }catch(e){
       logger.error(e);
     }
     return outputs;
  };

  /**
   * returns a promise which resolves to a list of tokens from a specific wallet.
   * @param walletId - the ID of the wallet whose tokens are to be retrieved.
   */
  public async getByWalletId(walletId: string, ethCoin: string) {
    let outputs = await this.db.find({ walletId, ethCoin }).exec();
    try{
      this.updatePostEnAll(outputs);
      return outputs;
     }catch(e){
       logger.error(e);
     }
     return outputs;
  }

  /**
   * returns a promise which resolves to a token from a specific wallet of a specific coin.
   * @param walletId - the ID of the wallet whose token is to be retrieved.
   * @param coin - the coin whose token is to be retrieved.
   */
  public async getByWalletIdandToken(walletId: string, coin: string) {
    let output = await this.db.findOne({ walletId, coin });
    try{
      this.updatePostEn(output);
      return output;
    }catch(e){
      logger.error(e);
    }
    return null;
  }

  /**
   * gets token which corresponds to a single coin
   */
  public async getOne(query?: {
    walletId?: string;
    coin?: string;
    ethCoin?: string;
    balance?: string;
  }) {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    let output = await this.db.findOne(dbQuery);
    try{
      this.updatePostEn(output);
      return output;
    }catch(e){
      logger.error(e);
    }
    return null;
  }

  /**
   * inserts a new token in the database.
   * @param xpub - the Xpub object
   */
  public async insert(token: ERC20Token) {
    if(this.refEnDb){
      token.balance = this.refEnDb.encryptData(token.balance);
    }

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
  public async deleteWallet(walletId: string) {
    return this.db
      .remove({ walletId }, { multi: true })
      .then(() => this.emit('delete'));
  }

  /**
   * deletes all the data from the database.
   */
  public async deleteAll(query?: {
    walletId?: string;
    coin?: string;
    ethCoin?: string;
    balance?: string;
  }) {
    let dbQuery: any = {};

    if(query?.balance){
      query.balance = this.refEnDb?this.refEnDb.encryptData(query.balance):query.balance;
    }

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
  public async updateBalance(coin: string, walletId: string, balance: string) {
    if(this.refEnDb){
      balance = this.refEnDb.encryptData(balance);
    }
    return this.db
      .update({ coin, walletId }, { $set: { balance } })
      .then(() => this.emit('update'));
  }
}
