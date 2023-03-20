import crypto from 'crypto';
import { EventEmitter } from 'events';
import { PassEncrypt } from '../dbs';
import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import PouchDBWebSQLAdapter from 'pouchdb-adapter-websql';
import PouchFind from 'pouchdb-find';
import PouchUpsert from 'pouchdb-upsert';
import PouchTransform from 'transform-pouch';
import IModel, { IS_ENCRYPTED } from '../models/model';
PouchDB.plugin(PouchDBMemoryAdapter);
PouchDB.plugin(PouchDBWebSQLAdapter);
PouchDB.plugin(PouchUpsert);
PouchDB.plugin(PouchFind);
PouchDB.plugin(PouchTransform);

const POUCHDB_ADAPTER = 'websql';

export abstract class Database<T> {
  protected table: string;
  protected db: PouchDB.Database<T>;
  public emitter = new EventEmitter();
  public databaseVersion: string | undefined;
  protected refEnDb: PassEncrypt | undefined;
  /**
   *  on setting password, these fields would be encrypted
   */
  protected secretFields: string[] = [];
  protected fieldIndexMap = new Map<string, string>();
  protected indexedFields: string[] = [];

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
    if (indexedFields) this.indexedFields = indexedFields;
    this.db = this.createDatabase();
  }

  private createDatabase() {
    const db = new PouchDB<T>(this.table, {
      adapter: POUCHDB_ADAPTER,
      auto_compaction: true,
      revs_limit: 1
    });
    db.transform({
      incoming: (doc: any) => {
        if (
          this.refEnDb &&
          this.refEnDb?.passSet &&
          this.secretFields.length > 0 &&
          (doc.isEncrypted === IS_ENCRYPTED.NO || !doc.isEncrypted)
        ) {
          this.secretFields.forEach(field => {
            doc[field] = this.refEnDb?.encryptData(doc[field]);
          });
          doc.isEncrypted = IS_ENCRYPTED.YES;
        }
        return doc;
      },
      outgoing: (doc: any) => {
        if (
          this.refEnDb &&
          this.refEnDb.passSet &&
          this.secretFields.length > 0 &&
          doc.isEncrypted === IS_ENCRYPTED.YES
        ) {
          this.secretFields.forEach(field => {
            doc[field] = this.refEnDb?.decryptData(doc[field]);
          });
          doc.isEncrypted = IS_ENCRYPTED.NO;
        }
        return doc;
      }
    });

    return db;
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
   * Loads the data from the database. To be used before any other operation.
   */
  public async intialise() {
    await Promise.all(
      this.indexedFields.map(async field => {
        const response = await this.db.createIndex({
          index: {
            name: `idx-${field}`,
            fields: [field]
          }
        });
        this.fieldIndexMap.set(field, (response as any).id);
      })
    );
  }

  private createdDBObject(obj: T) {
    return {
      ...obj,
      databaseVersion: this.databaseVersion
    };
  }

  public static buildIndexString(...fields: any[]) {
    return `idx-${fields.map(field => `${field}`).join('/')}`;
  }

  /**
   *
   * Update the document based on the unique fields if already present
   * or else create a new document
   */
  public async insert(doc: T) {
    const docId = (doc as any)._id;
    await this.db.upsert(docId, () => this.createdDBObject(doc));
    this.emit('insert');
  }

  public async insertMany(docs: T[]) {
    const docsObjList = docs.map(elem => this.createdDBObject(elem));
    const responses = await this.db.bulkDocs(docsObjList);
    await Promise.all(
      responses.map((response, idx) => {
        if (response.rev) return;
        return this.insert(docsObjList[idx]);
      })
    );
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
    const docs = res.docs.map(doc => ({
      ...doc,
      _deleted: true
    }));

    if (docs.length > 0) {
      await this.db.bulkDocs(docs);
    }

    this.emit('delete');
  }

  protected async deleteTruly(query: Partial<T>) {
    const res = await this.db.find({ selector: query });
    const docs = res.docs.map(doc => ({
      ...doc,
      _deleted: true
    }));

    if (docs.length > 0) {
      await this.db.bulkDocs(docs);

      const deleteFilter = (doc: { _deleted: any }, _: any) => !doc._deleted;
      await this.syncAndResync({ filter: deleteFilter });
    }

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
      skip?: number;
    }
  ) {
    if (sorting?.field) {
      if (sorting && !this.fieldIndexMap.has(sorting.field))
        throw new Error(
          `Couldn't find index for the provided sorting field ${sorting.field}`
        );
      if (sorting.limit)
        return (
          await this.db.find({
            selector: dbQuery,
            limit: sorting.limit,
            skip: sorting.skip || 0,
            use_index: this.fieldIndexMap.get(sorting.field),
            sort: [{ [sorting.field]: sorting.order }]
          })
        ).docs;
      else {
        const resp = await this.db.find({
          selector: dbQuery,
          use_index: this.fieldIndexMap.get(sorting.field),
          skip: sorting.skip || 0,
          sort: [{ [sorting.field]: sorting.order }]
        });
        return resp.docs;
      }
    }
    return (await this.db.find({ selector: dbQuery })).docs;
  }
  /**
   * This function is to be to used whenever you want to either purge the database
   *  and truly delete the documents
   *
   * @param runner - an optional function to run before the sync
   * @param filter - an optional filter to apply to the sync
   *
   * @returns a promise that resolves when the sync is complete
   */
  protected async syncAndResync(params: {
    beforeStore?: () => Promise<void>;
    afterStore?: () => Promise<void>;
    filter?: PouchDB.Replication.ReplicateOptions['filter'];
  }) {
    const { beforeStore, afterStore, filter } = params;
    const defaultFilter = (doc: { _deleted: any }, _: any) => !doc._deleted;

    const tempDB = new PouchDB(
      `tempDB-${this.table}-${crypto.randomBytes(8).toString('hex')}`,
      { adapter: 'memory' }
    );
    await this.db.replicate.to(tempDB, { filter: filter || defaultFilter });
    await this.db.destroy();

    if (beforeStore) await beforeStore();

    this.db = this.createDatabase();
    await tempDB.replicate.to(this.db);

    if (afterStore) await afterStore();
    await tempDB.destroy();
  }

  public async encryptSecrets(newHash: string, oldHash: string): Promise<void> {
    await this.syncAndResync({
      beforeStore: async () => {
        this.refEnDb?.setPassHash(newHash);
      },
      afterStore: async () => {
        this.refEnDb?.setPassHash(oldHash);
      }
    });
  }

  public async decryptSecrets(oldHash: string): Promise<void> {
    await this.syncAndResync({
      beforeStore: async () => {
        this.refEnDb?.destroyHash();
      },
      afterStore: async () => {
        this.refEnDb?.setPassHash(oldHash);
      }
    });
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
