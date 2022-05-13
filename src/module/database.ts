import DataStore from 'nedb';
import { EventEmitter } from 'events';

import NedbPromise from './nedbPromise';
import PassEncrypt from '../dbs2/passHash';
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
    this.refEnDb = enDb;
    this.db = new NedbPromise(
      new DataStore<T>({
        filename: `${userDataPath}/databases/${database}.db`,
        timestampData: true,
        autoload: !this.refEnDb,
    
        beforeDeserialization: this.refEnDb
          ? (input: string) => {
              if (this.refEnDb) {
                return this.refEnDb.decryptData(input);
              }
              return input;
            }
          : undefined,
        afterSerialization: this.refEnDb
          ? (input: string) => {
              if (this.refEnDb) {
                return this.refEnDb.encryptData(input);
              }
              return input;
            }
          : undefined
      })
    );
    this.databaseVersion = databaseVersion;
  }

  /**
   * Loads the data from the database. To be used before any other operation.
   */
  public loadData() {
    return this.db.loadData();
  }

  /**
   * emits an event
   * @param event - the event to emit.
   * @param payload - the payload to emit. can be anything, boolean, object, string
   */
  public emit(event: string, payload?: any) {
    this.emitter.emit(event, payload);
  }

  public async updateAll(outputs: T[]) {
    await this.deleteAll();
    await this.db.insertMany(outputs);
  }

  /**
   * Deletes all the entries
   */
  public async deleteAll() {
    await this.db.remove({}, { multi: true }).then(() => this.emit('detele'));
    this.db.compactDatafile();
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
