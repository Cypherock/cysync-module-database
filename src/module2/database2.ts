import { EventEmitter } from 'events';
import { PassEncrypt } from '../dbs2';
import logger from '../utils/logger';
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
    this.db = new PouchDB<T>(table, { adapter: 'websql' });
  }

  /**
   * emits an event
   * @param event - the event to emit.
   * @param payload - the payload to emit. can be anything, boolean, object, string
   */
  public emit(event: string, payload?: any) {
    this.emitter.emit(event, payload);
  }

  public async insert(doc: T) {
    console.log('insert', doc);
    try {
      await this.db.put(doc, { force: true });
    } catch(e) {
      logger.error('insert error', e);
    }
    this.emit('insert');
  }

  public async insertMany(docs: T[]) {
    await this.db.bulkDocs(docs);
    this.emit('insert');
  }

  public async getById(id: string) {
    const res = await this.db.find({ selector: { _id: id } });
    if (res.docs.length === 0) {
      return null;
    }
    return res.docs[0];
  }

  public async getOne(query: Partial<T>) {
    const res = await this.db.find({ selector: query });
    if (res.docs.length === 0) {
      return null;
    }
    return res.docs[0];
  }

  public async getAll(query?: Partial<T>) {
    if (query) {
      return (await this.db.find({ selector: query })).docs;
    }
    return (await this.db.allDocs({ include_docs: true })).rows.map(
      row => row.doc
    );
  }

  public async findAndUpdate(query: Partial<T>, doc: Partial<T>) {
    const res = await this.db.find({ selector: query });
    const docs = [...res.docs];
    console.log('findAndUpdate', docs, doc);
    const updatedDocs = docs.map(each => {
      return {
        ...each,
        ...doc
      };
    });
    await this.db.bulkDocs(updatedDocs);
    this.emit('update');
  }

  public async update(doc: T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta) {
    await this.db.put(doc);
    this.emit('update');
  }

  public async delete(query: Partial<T>) {
    const res = await this.db.find({ selector: query });
    const docs = res.docs;
    for (const doc of docs) {
      await this.db.remove(doc);
    }
    this.emit('delete');
  }

  public async deleteById(id: string) {
    const doc = await this.db.get(id);
    await this.db.remove(doc);
    this.emit('delete');
  }
}
