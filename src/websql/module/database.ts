import { EventEmitter } from 'events';
import { PassEncrypt } from '../dbs';
import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import PouchDBWebSQLAdapter from 'pouchdb-adapter-websql';
import PouchFind from 'pouchdb-find';
import PouchTransform from 'transform-pouch';
import IModel, { IS_ENCRYPTED } from '../models/model';
PouchDB.plugin(PouchDBMemoryAdapter);
PouchDB.plugin(PouchDBWebSQLAdapter);
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
  protected secretFields = [''];
  protected fieldIndexMap = new Map<string, string>();
  protected indexedFields = [''];

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
    this.db = new PouchDB<T>(table, {
      adapter: POUCHDB_ADAPTER,
      auto_compaction: true,
      revs_limit: 1
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

  protected buildIndexString(...fields: any[]) {
    return `idx-${fields.map(field => `${field}`).join('/')}`;
  }

  /**
   *
   * Update the document based on the unique fields if already present
   * or else create a new document
   */
  public async insert(doc: T) {
    try {
      const existingDoc = await this.db.get((doc as any)._id);
      const updatedDoc = {
        ...existingDoc,
        ...doc
      };
      await this.db.put(updatedDoc);
    } catch (e: any) {
      if (e.status === 404) {
        await this.db.put(this.createdDBObject(doc));
      }
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
    const docs = res.docs.map(doc => ({
      ...doc,
      _deleted: true
    }));
    await this.db.bulkDocs(docs);
    this.emit('delete');
  }

  protected async deleteTruly(query: Partial<T>) {
    const res = await this.db.find({ selector: query });
    const docs = res.docs.map(doc => ({
      ...doc,
      _deleted: true
    }));
    await this.db.bulkDocs(docs);

    const deleteFilter = (doc: { _deleted: any }, _: any) => !doc._deleted;
    await this.syncAndResync(undefined, deleteFilter);
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
  protected async syncAndResync(
    runner?: () => Promise<void>,
    filter?: PouchDB.Replication.ReplicateOptions['filter']
  ) {
    const tempDB = new PouchDB('tempDB', { adapter: 'memory' });
    await this.db.replicate.to(tempDB, { filter });
    await this.db.destroy();

    if (runner) await runner();

    this.db = new PouchDB(this.table, { adapter: POUCHDB_ADAPTER });
    await this.db.replicate.from(tempDB);
    tempDB.destroy();
  }

  public async encryptSecrets(singleHash: string): Promise<void> {
    await this.syncAndResync(async () => {
      this.refEnDb?.setPassHash(singleHash);
    });
  }

  public async decryptSecrets(): Promise<void> {
    await this.syncAndResync(async () => {
      this.refEnDb?.destroyHash();
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
