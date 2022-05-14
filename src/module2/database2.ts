import { EventEmitter } from 'events';
import { PassEncrypt } from '../dbs2';
import logger from '../utils/logger';
import PouchDB from 'pouchdb';
import PouchDBWebSQLAdapter from 'pouchdb-adapter-websql';
import PouchFind from 'pouchdb-find';
import PouchTransform from 'transform-pouch';
import IModel, { ISENCRYPTED } from '../models2/model';
PouchDB.plugin(PouchDBWebSQLAdapter);
PouchDB.plugin(PouchFind);
PouchDB.plugin(PouchTransform);

export abstract class Db<T> {
  protected table: string;
  protected db: PouchDB.Database<T>;
  public emitter = new EventEmitter();
  protected refEnDb: PassEncrypt | undefined;
  /**
   *  on setting password, these fields would be encrypted
   *  */
  protected secretFields = [''];

  constructor(table: string, enDb?: PassEncrypt) {
    this.table = table;
    this.refEnDb = enDb;
    this.db = new PouchDB<T>(table, {
      adapter: 'websql',
      auto_compaction: true
    });
    this.db.transform({
      incoming: (doc: any) => {
        if (
          this.refEnDb &&
          this.refEnDb?.passSet &&
          doc.isEncrypted == ISENCRYPTED.NO
        ) {
          this.secretFields.forEach(field => {
            doc[field] = enDb!.encryptData(doc[field]);
          });
          doc.isEncrypted = ISENCRYPTED.YES;
        }
        return doc;
      },
      outgoing: (doc: any) => {
        if (
          this.refEnDb &&
          this.refEnDb.passSet &&
          doc.isEncrypted == ISENCRYPTED.YES
        ) {
          this.secretFields.forEach(field => {
            doc[field] = enDb!.decryptData(doc[field]);
          });
          doc.isEncrypted = ISENCRYPTED.NO;
        }
        return doc;
      }
    });
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
    try {
      await this.db.put(doc, { force: true });
    } catch (e) {
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

  public async getAll(query?: Partial<T | IModel>) {
    if (query) {
      return (await this.db.find({ selector: query })).docs;
    }
    return (await this.db.find({ selector: { _id: { $gte: null } } })).docs;
  }

  public async findAndUpdate(query: Partial<T>, doc: Partial<T>) {
    const res = await this.db.find({ selector: query });
    const docs = [...res.docs];
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
    await this.db.put(doc, { force: true });
    this.emit('update');
  }

  public async delete(query: Partial<T>) {
    const res = await this.db.find({ selector: query });
    const docs = res.docs;
    await Promise.all(docs.map(doc => this.db.remove(doc)));
    this.emit('delete');
  }

  public async deleteById(id: string) {
    const doc = await this.db.get(id);
    await this.db.remove(doc);
    this.emit('delete');
  }

  public async encryptSecrets(singleHash: string): Promise<void> {
    const docs = await this.getAll({ isEncrypted: ISENCRYPTED.NO });
    this.refEnDb?.setPassHash(singleHash);
    if (docs.length > 0) {
      await this.db.bulkDocs(docs);
    }
  }

  public async decryptSecrets(): Promise<void> {
    const docs = await this.getAll();
    this.refEnDb?.destroyHash();
    if (docs.length > 0) {
      await this.db.bulkDocs(docs);
    }
  }
}
