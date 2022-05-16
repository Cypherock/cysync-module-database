import DataStore from 'nedb';

/**
 * This is a wrapper around NeDb.Cursor for converting it's functions from
 * callback to a promise.
 */
export default class PromiseCursor<T> {
  public cursor: DataStore.Cursor<T>;

  public constructor(cursor: DataStore.Cursor<T>) {
    this.cursor = cursor;
  }

  public sort(query: any): PromiseCursor<T> {
    const newCursor = this.cursor.sort(query);
    this.cursor = newCursor;

    return this;
  }

  public skip(n: number): PromiseCursor<T> {
    const newCursor = this.cursor.skip(n);
    this.cursor = newCursor;

    return this;
  }

  public limit(n: number): PromiseCursor<T> {
    const newCursor = this.cursor.limit(n);
    this.cursor = newCursor;

    return this;
  }

  public projection(query: any): PromiseCursor<T> {
    const newCursor = this.cursor.projection(query);
    this.cursor = newCursor;

    return this;
  }

  public exec(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.cursor.exec((error, document) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(document);
      });
    });
  }
}
