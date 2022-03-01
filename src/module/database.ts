import DataStore from 'nedb';
import { EventEmitter } from 'events';

import NedbPromise from './nedbPromise';
import PassEncrypt from './../dbs/passHash';
import { PassEncryptError, PassEncryptErrType } from '..';
/**
 * abstract class to initiate the database.
 */
export default abstract class Database<T> {
  public dbName: string;
  public db: NedbPromise<T>;
  public emitter = new EventEmitter();
  public databaseVersion: string | undefined;
  protected refEnDb: PassEncrypt | undefined;

  /**
   * initiates the nedb database and calls the super constructor
   * @param database - the name of the database
   * @param baseURL - the base URL
   * @param userDataPath - the file path to store these files in a different folder when this module is used in electron
   * @protected
   */
  protected constructor(
    database: string,
    userDataPath = '',
    databaseVersion?: string,
    enDb?: PassEncrypt
  ) {
    this.dbName = database;
    this.db = new NedbPromise(
      new DataStore<T>({
        filename: `${userDataPath}/databases/${database}.db`,
        timestampData: true,
        autoload: true,
        beforeDeserialization(inp: string) {
          if (database !== 'xpubs') {
            return inp;
          }
          if (!enDb) {
            throw new PassEncryptError(PassEncryptErrType.OBJ_UNDEF);
          }
          return enDb.decryptData(inp);
        },
        afterSerialization(inp: string) {
          if (database !== 'xpubs') {
            return inp;
          }
          if (!enDb) {
            throw new PassEncryptError(PassEncryptErrType.OBJ_UNDEF);
          }
          return enDb.encryptData(inp);
        }
      })
    );
    this.databaseVersion = databaseVersion;
    this.refEnDb = enDb;
  }

  /**
   * emits an event
   * @param event - the event to emit.
   * @param payload - the payload to emit. can be anything, boolean, object, string
   */
  public emit(event: string, payload?: any) {
    this.emitter.emit(event, payload);
  }

  /**
   * Deletes all the entries
   */
  public async deleteAll() {
    return this.db.remove({}, { multi: true }).then(() => this.emit('detele'));
  }

  public createdDBObject(obj: any) {
    return {
      ...obj,
      databaseVersion: this.databaseVersion
    };
  }

  public async hasIncompatableData() {
    if (this.databaseVersion) {
      const incompatibaleData = await this.db.count({
        $or: [
          { databaseVersion: { $ne: this.databaseVersion } },
          { databaseVersion: { $exists: false } }
        ]
      });

      return incompatibaleData !== 0;
    } else {
      return false;
    }
  }
}
