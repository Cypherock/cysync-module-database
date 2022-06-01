import { EventEmitter } from 'events';
import { PassEncrypt } from '../dbs';
import logger from '../../utils/logger';
import PouchDB from 'pouchdb';
import PouchDBWebSQLAdapter from 'pouchdb-adapter-websql';
import PouchFind from 'pouchdb-find';
import PouchTransform from 'transform-pouch';
import IModel, { IS_ENCRYPTED } from '../models/model';
PouchDB.plugin(PouchDBWebSQLAdapter);
PouchDB.plugin(PouchFind);
PouchDB.plugin(PouchTransform);

export abstract class Database<T> {
  protected table: string;
  protected db: PouchDB.Database<T>;
  public emitter = new EventEmitter();
  public databaseVersion: string | undefined;
  protected refEnDb: PassEncrypt | undefined;
  /**
   *  on setting password, these fields would be encrypted
   */
  protected secretFields = [''];
  private fieldIndexMap = new Map<string, string>();

  constructor(
    table: string,
    options: {
      databaseVersion: string;
      indexedFields?: string[];
      enDb?: PassEncrypt;
    }
  ) {
    const { enDb, databaseVersion, indexedFields } = options;
    this.table = table;
    this.refEnDb = enDb;
    this.databaseVersion = databaseVersion;
    this.db = new PouchDB<T>(table, {
      adapter: 'websql',
      auto_compaction: true
    });
    if (indexedFields)
      indexedFields.forEach(async field => {
        const response = await this.db.createIndex({
          index: {
            name: `idx-${field}`,
            fields: [field]
          }
        });
        this.fieldIndexMap.set(field, (response as any).id);
      });
    this.db.transform({
      incoming: (doc: any) => {
        if (
          this.refEnDb &&
          this.refEnDb?.passSet &&
          doc.isEncrypted === IS_ENCRYPTED.NO
        ) {
          this.secretFields.forEach(field => {
            doc[field] = enDb!.encryptData(doc[field]);
          });
          doc.isEncrypted = IS_ENCRYPTED.YES;
        }
        return doc;
      },
      outgoing: (doc: any) => {
        if (
          this.refEnDb &&
          this.refEnDb.passSet &&
          doc.isEncrypted === IS_ENCRYPTED.YES
        ) {
          this.secretFields.forEach(field => {
            doc[field] = enDb!.decryptData(doc[field]);
          });
          doc.isEncrypted = IS_ENCRYPTED.NO;
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

  private createdDBObject(obj: T) {
    return {
      ...obj,
      databaseVersion: this.databaseVersion
    };
  }

  protected buildIndexString(...fields: any[]) {
    return `idx-${fields.map(field => `${field}`).join('/')}`;
  }

  public async insert(doc: T) {
    try {
      await this.db.put(this.createdDBObject(doc), { force: true });
    } catch (e) {
      logger.error('insert error', e);
    }
    this.emit('insert');
  }

  public async insertMany(docs: T[]) {
    const docsObjects = docs.map(doc => this.createdDBObject(doc));
    await this.db.bulkDocs(docsObjects);
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

  public async executeQuery(
    dbQuery: any,
    sorting?: {
      field: string;
      order: 'asc' | 'desc';
      limit?: number;
    }
  ) {
    if (sorting?.field) {
      if (sorting && !this.fieldIndexMap.has(sorting.field))
        throw new Error(
          `Couldn't find index for the provided sorting field ${sorting.field}`
        );
      return (
        await this.db.find({
          selector: dbQuery,
          limit: sorting.limit || -1,
          use_index: this.fieldIndexMap.get(sorting.field),
          sort: [{ [sorting.field]: sorting.order }]
        })
      ).docs;
    }
    return (await this.db.find({ selector: dbQuery })).docs;
  }

  public async encryptSecrets(singleHash: string): Promise<void> {
    const docs = await this.getAll({ isEncrypted: IS_ENCRYPTED.NO });
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

  public async hasIncompatableData() {
    if (this.databaseVersion) {
      const incompatibaleData = await this.db.find({
        selector: {
          databaseVersion: { $ne: this.databaseVersion }
        }
      });

      return incompatibaleData.docs.length > 0;
    } else {
      return false;
    }
  }
}
