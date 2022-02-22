import Service from '../module/database';
import Xpub, { XpubBalance } from '../models/xpub';
import logger from '../utils/logger';
import PassEncrypt from './passHash';


/**
 * Class for the Xpubs database. This db stores all the xpubs with their last updated balances and their corresponding
 * wallet ID and coin type. This class also emits "insert", "delete", and "update" events in case of these operations.
 */
export default class XpubDB extends Service<Xpub> {

  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '', EnDb:PassEncrypt) {
    super('xpubs', userDataPath, 'v2', EnDb);
    // To remove previously created index
    this.db.removeIndex('xpub').catch(error => {
      logger.error('Error in removing xpub index');
      logger.error(error);
    });
  }

  public updatePostEn(output:Xpub){
    if(!this.refEnDb){
      return false;
    }
    output.totalBalance.balance = this.refEnDb.decryptData(output.totalBalance.balance);
    output.totalBalance.unconfirmedBalance = this.refEnDb.decryptData(output.totalBalance.unconfirmedBalance);

    output.xpubBalance.balance = this.refEnDb.decryptData(output.xpubBalance.balance);
    output.xpubBalance.unconfirmedBalance = this.refEnDb.decryptData(output.xpubBalance.unconfirmedBalance);

    if(output.zpubBalance){
      output.zpubBalance.balance = this.refEnDb.decryptData(output.zpubBalance.balance);
      output.zpubBalance.unconfirmedBalance = this.refEnDb.decryptData(output.zpubBalance.unconfirmedBalance);  
    }

    output.xpub = this.refEnDb.decryptData(output.xpub);
    if(output.zpub){
      output.zpub = this.refEnDb.decryptData(output.zpub);
    }
    return true;
  }

  public async updatePostEnAll(outputs:Xpub[], flag?:boolean){
    for(let output of outputs){
      if(!this.updatePostEn(output)){
        throw "ref enDb is not defined";
      }
      if(flag){
        let temp:Xpub = {...output};
        if(this.refEnDb){
          temp.xpubBalance.balance = this.refEnDb.encryptData(temp.xpubBalance.balance);
          temp.xpubBalance.unconfirmedBalance = this.refEnDb.encryptData(temp.xpubBalance.unconfirmedBalance);
          
          if(temp.zpubBalance){
            temp.zpubBalance.balance = this.refEnDb.encryptData(temp.zpubBalance.balance);
            temp.zpubBalance.unconfirmedBalance = this.refEnDb.encryptData(temp.zpubBalance.unconfirmedBalance);
          }
    
          temp.totalBalance.balance = this.refEnDb.encryptData(temp.xpubBalance.balance);
          temp.totalBalance.unconfirmedBalance = this.refEnDb.encryptData(temp.xpubBalance.unconfirmedBalance);
    
          temp.xpub = this.refEnDb.encryptData(output.xpub);
          if(output.zpub){
            temp.zpub = this.refEnDb.encryptData(output.zpub);
          }
        }
        await this.db.update({walletId:output.walletId}, {$set: { xpub:temp.xpub, balance:temp.balance, zpub:temp.zpub }});
      }
    }
    return outputs;
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

    let outputs:Xpub[] = await this.db.find(dbQuery).exec();
    try{
      this.updatePostEnAll(outputs);
      return outputs;
     }catch(e){
       logger.error(e);
     }
     return null;
  };

  /**
   * returns a promise which resolves to a list of xpubs of a specific coin.
   * @param coin - the coin abbr whose xpubs is to be retrieved
   */
  public getByCoin = async (coin: string) => {
    let outputs:Xpub[] = await this.db.find({ coin }).exec();
    try{
      this.updatePostEnAll(outputs);
      return outputs;
     }catch(e){
       logger.error(e);
     }
   return null;
 };

  /**
   * returns a promise which resolves to a list of xpubs from a specific wallet.
   * @param walletId - the ID of the wallet whose xpubs are to be retrieved.
   */
  public async getByWalletId(walletId: string) {
    let outputs:Xpub[] = await this.db.find({ walletId }).exec();
     try{
       this.updatePostEnAll(outputs);
       return outputs;
      }catch(e){
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
   * inserts a new xpub in the database.
   * @param xpub - the Xpub object
   */
  public async insert(xpub: Xpub) {

    if(this.refEnDb){
      xpub.xpubBalance.balance = this.refEnDb.encryptData(xpub.xpubBalance.balance);
      xpub.xpubBalance.unconfirmedBalance = this.refEnDb.encryptData(xpub.xpubBalance.unconfirmedBalance);
      
      if(xpub.zpubBalance){
        xpub.zpubBalance.balance = this.refEnDb.encryptData(xpub.zpubBalance.balance);
        xpub.zpubBalance.unconfirmedBalance = this.refEnDb.encryptData(xpub.zpubBalance.unconfirmedBalance);
      }

      xpub.totalBalance.balance = this.refEnDb.encryptData(xpub.xpubBalance.balance);
      xpub.totalBalance.unconfirmedBalance = this.refEnDb.encryptData(xpub.xpubBalance.unconfirmedBalance);

      xpub.xpub = this.refEnDb.encryptData(xpub.xpub);
      if(xpub.zpub){
        xpub.zpub = this.refEnDb.encryptData(xpub.zpub);
      }
    }

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
    if(this.refEnDb){
      xpub = this.refEnDb.encryptData(xpub);
    }
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
    if(this.refEnDb){
      xpub = this.refEnDb.encryptData(xpub);
      balance.balance = this.refEnDb.encryptData(balance.balance);
      balance.unconfirmedBalance = this.refEnDb.encryptData(balance.unconfirmedBalance);
    }

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
    if(this.refEnDb){
      xpub = this.refEnDb.encryptData(xpub);
      balance.balance = this.refEnDb.encryptData(balance.balance);
      balance.unconfirmedBalance = this.refEnDb.encryptData(balance.unconfirmedBalance);
    }

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
    if(this.refEnDb){
      xpub = this.refEnDb.encryptData(xpub);
      balance.balance = this.refEnDb.encryptData(balance.balance);
      balance.unconfirmedBalance = this.refEnDb.encryptData(balance.unconfirmedBalance);
    }

    return this.db
      .update({ xpub, coin }, { $set: { totalBalance: balance } })
      .then(() => this.emit('update'));
  }
}
