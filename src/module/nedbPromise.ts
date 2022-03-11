import DataStore from 'nedb';
import PromiseCursor from './promiseCursor';

/**
 * This is a wrapper around NeDb for converting it's functions from
 * callback to a promise.
 */
export default class NeDb<T> {
  private db: DataStore<T>;

  public constructor(database: DataStore<T>) {
    this.db = database;
  }

  public loadData() {
    return new Promise<void>((resolve, reject) => {
      this.db.loadDatabase(err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Force write data to disk
   */
  public compactDatafile() {
    this.db.persistence.compactDatafile();
  }

  public ensureIndex(options: DataStore.EnsureIndexOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.ensureIndex(options, error => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  public removeIndex(fieldName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.removeIndex(fieldName, error => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  public insert(newDoc: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.insert(newDoc, (error, document) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(document);
      });
    });
  }

  public insertMany(newDocs: T[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.insert(newDocs, (error, document) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(document);
      });
    });
  }

  public update(
    query: any,
    updateQuery: any,
    options: DataStore.UpdateOptions = {}
  ): Promise<{ numberOfUpdated: number; upsert: boolean }> {
    return new Promise((resolve, reject) => {
      this.db.update(
        query,
        updateQuery,
        options,
        (error, numberOfUpdated, upsert) => {
          if (error) {
            reject(error);
            return;
          }

          resolve({ numberOfUpdated, upsert });
        }
      );
    });
  }

  public find(query: any, projection?: any): PromiseCursor<T> {
    const cursor = this.db.find(query, projection);
    return new PromiseCursor<T>(cursor);
  }

  public findOne(query: any, projection?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.findOne(query, projection, (error, document) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(document);
      });
    });
  }

  public remove(
    query: any,
    options: DataStore.RemoveOptions = {}
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove(query, options, (error, document) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(document);
      });
    });
  }

  public count(query: any): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.count(query, (error, count) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(count);
      });
    });
  }
}
