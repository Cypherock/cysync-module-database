import Service from '../module/database';
import ReceiveAddress from '../models/receiveAddress';
import PassEncrypt from "./passHash";
import logger from '../utils/logger';

/**
 * Class for the Receive Address database. This db stores all the latest addresses with their corresponding xpub,
 * coinType. This class also emits "insert", "delete" event in case of these operations.
 */
export default class ReceiveAddressDB extends Service<ReceiveAddress> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '', enDb:PassEncrypt) {
    super('receiveAddresses', userDataPath, 'v1', enDb);
  }

  public updatePostEn(output:ReceiveAddress){
    if(!this.refEnDb){
      return false;
    }
    output.address = this.refEnDb.decryptData(output.address);
    return true;
  }

  public async updatePostEnAll(outputs:ReceiveAddress[], flag?:boolean){
    for(let output of outputs){
      if(!this.updatePostEn(output)){
        throw "ref enDb is not defined";
      }
      if(flag){
        let temp:string = output.address;
        
        if(this.refEnDb){
          temp = this.refEnDb.encryptData(output.address);
        }
        
        await this.db.update({address:output.address}, {$set: { address:temp }});
      }
    }
    return outputs;
  }

  /**
   * returns a promise which resolves to a list of all addresses in the database.
   */
  public getAll = async () => {
    let outputs = await this.db.find({}).exec();
    try{
      this.updatePostEnAll(outputs);
      return outputs;
     }catch(e){
       logger.error(e);
     }
     return null;
  };

  /**
   * inserts a new Address in the database.
   * @param address - the Address object
   */
  public async insert(address: ReceiveAddress) {
    if(this.refEnDb){
      address.address = this.refEnDb.encryptData(address.address);
    }

    return this.db
      .update(
        { walletId: address.walletId, coinType: address.coinType },
        this.createdDBObject(address),
        {
          upsert: true
        }
      )
      .then(() => this.emit('insert'));
  }

  /**
   * deletes an Address object from the database using the address.
   * @param address - the address
   */
  public async delete(address: string) {
    if(this.refEnDb){
      address = this.refEnDb.encryptData(address);
    }
    return this.db.remove({ address }).then(() => this.emit('delete'));
  }

  /**
   * deletes all the data from the database.
   */
  public async deleteAll(query?: {
    walletId?: string;
    address?: string;
    coinType?: string;
  }) {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    return this.db
      .remove(dbQuery, { multi: true })
      .then(() => this.emit('delete'));
  }
}
