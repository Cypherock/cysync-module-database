import { EventEmitter } from 'events';
import { PassEncrypt } from '../dbs2';
// import logger from '../utils/logger';
import PouchDB from 'pouchdb';
import PouchDBWebSQLAdapter from 'pouchdb-adapter-websql';
import PouchFind from 'pouchdb-find';
PouchDB.plugin(PouchDBWebSQLAdapter);
PouchDB.plugin(PouchFind);

export abstract class Db<T> {
  public table: string;
  protected db: PouchDB.Database<T>;
  public emitter = new EventEmitter();
  protected refEnDb: PassEncrypt | undefined;

  constructor(table: string, enDb?: PassEncrypt) {
    this.table = table;
    this.refEnDb = enDb;
    this.db = new PouchDB<T>(table, {adapter: 'websql'});
  }

  /**
   * emits an event
   * @param event - the event to emit.
   * @param payload - the payload to emit. can be anything, boolean, object, string
   */
  public emit(event: string, payload?: any) {
    this.emitter.emit(event, payload);
  }
}
