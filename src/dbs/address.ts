import Service from '../module/database';
import Address from '../models/address';
import PassEncrypt from "./passHash";
import logger from "../utils/logger"

/**
 * Class for the Address database. This db stores all the addresses with their corresponding xpub,
 * coinType, chainIndex and addressIndex. This class also emits "insert", "delete" event in case of these operations.
 */
export default class AddressDB extends Service<Address> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '', enDb:PassEncrypt) {
    super('addresses', userDataPath, 'v1', enDb);
  }


  public updatePostEn(output:Address){
    if(!this.refEnDb){
      return false;
    }
    output.address = this.refEnDb.decryptData(output.address);
    output.xpub = this.refEnDb.decryptData(output.xpub);
    return true;
  }

  public async updatePostEnAll(outputs:Address[], flag?:boolean){
    for(let output of outputs){
      if(!this.updatePostEn(output)){
        throw "ref enDb is not defined";
      }
      if(flag){
        let temp:Address = {...output};
        if(this.refEnDb){
          temp.address = this.refEnDb.encryptData(output.address);
          temp.xpub = this.refEnDb.encryptData(output.xpub);
        }
        await this.db.update({walletId:output.address}, {$set: { address:temp.address, xpub:temp.xpub}});
      }
    }
    return outputs;
  }



  /**
   * returns a promise which resolves to a list of all addresses in the database.
   */
  public getAll = async (
    query?: {
      address?: string;
      xpub?: string;
      coinType?: string;
      chainIndex?: number;
      addressIndex?: number;
      isSegwit?: boolean;
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

    let outputs = await this.db.find(dbQuery).exec();
    try{
      this.updatePostEnAll(outputs);
      return outputs;
     }catch(e){
       logger.error(e);
     }
     return null;
  };

  /**
   * returns a promise which resolves to chainIndex and addressIndex of the given address in the database.
   * If not found, returns null.
   */
  public getChainIndex = async (
    address: string,
    xpub: string,
    coinType: string
  ): Promise<{
    chainIndex: number;
    addressIndex: number;
    isSegwit: boolean;
  } | null> => {

    if(this.refEnDb){
      address = this.refEnDb.encryptData(address);
      xpub = this.refEnDb.encryptData(xpub);
    }

    const all = await this.db.find({ address, xpub, coinType }).exec();
    if (all.length === 0) {
      return null;
    }

    const { chainIndex, addressIndex, isSegwit } = all[0];

    // Chain Index or address Index -1 means that the data is missing.
    if (
      chainIndex === undefined ||
      addressIndex === undefined ||
      chainIndex === -1 ||
      addressIndex === -1
    ) {
      return null;
    }

    return { chainIndex, addressIndex, isSegwit };
  };

  /**
   * inserts a new Address in the database.
   * @param address - the Address object
   */
  public async insert(address: Address) {
    if(this.refEnDb){
      address.address = this.refEnDb.encryptData(address.address);
      address.xpub = this.refEnDb.encryptData(address.xpub);
    }
    return this.db
      .update(
        {
          xpub: address.xpub,
          coinType: address.coinType,
          address: address.address
        },
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
    address?: string;
    xpub?: string;
    coinType?: string;
    chainIndex?: number;
    addressIndex?: number;
    isSegwit?: boolean;
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
