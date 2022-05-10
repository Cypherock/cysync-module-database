import { EventEmitter } from 'events';
import logger from '../utils/logger';

export abstract class Db<T> {
  public table: string;
  protected db: Database;
  public emitter = new EventEmitter();

  constructor(table: string) {
    this.table = table;
    this.db = window.openDatabase(
      'Cypherock',
      '1.0',
      `Database storage for Cypherock`,
      5 * 1024 * 1024
    );
  }

  public executeSql(sql: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.transaction(function (t: SQLTransaction) {
        t.executeSql(
          sql,
          params,
          (_, r) => {
            resolve(r.rows);
          },
          (_, e) => {
            logger.error(sql, params, e);
            reject(e);
            return false;
          }
        );
      });
    });
  }

  public async insert(doc: T): Promise<void> {
    const keys = Object.keys(doc);
    const values = keys.map(k => {
      if (typeof (doc as any)[k] === 'boolean') {
        return (doc as any)[k] ? 1 : 0;
      } else if (typeof (doc as any)[k] === 'number') {
        return (doc as any)[k] as number;
      } else if ((doc as any)[k] instanceof Date) {
        return (doc as any)[k].getTime();
      } else {
        return (doc as any)[k] as string;
      }
    });
    const sql = `INSERT INTO ${this.table} (${keys.join(',')}) VALUES (${keys
      .map(() => '?')
      .join(',')})`;
    await this.executeSql(sql, values).then(() => this.emit('insert'));
  }

  public async getOne(query: Partial<T>): Promise<T | null> {
    const keys = Object.keys(query);
    const values = keys.map(k => (query as any)[k]);
    const sql = `SELECT * FROM ${this.table} WHERE ${keys
      .map(k => `${k} = ?`)
      .join(' AND ')}`;
    const rows = await this.executeSql(sql, values);
    if (rows.length === 0) {
      return null;
    }
    return rows.item(0);
  }

  public async getAll(
    query?: Partial<T>,
    sorting?: {
      sort: string;
      order?: 'asc' | 'desc';
      limit?: number;
    },
    andQuery?: string,
    andQueryValues?: any[]
  ): Promise<T[]> {
    let rows;
    if (!query) {
      rows = await this.executeSql(`SELECT * FROM ${this.table}`);
    } else {
      const keys = Object.keys(query);
      let values = keys.map(k => (query as any)[k]);
      let sql = `SELECT * FROM ${this.table} WHERE ${keys
        .map(k => `${k} = ?`)
        .join(' AND ')}`;

      if (keys.length === 0) sql += '1=1';
      if (andQuery && andQueryValues) {
        sql += ` ${andQuery}`;
        values = [...values, ...andQueryValues];
      }
      if (sorting) {
        sql += ` ORDER BY ${sorting.sort} ${sorting.order}`;
      }
      if (sorting?.limit) {
        sql += ` LIMIT ${sorting.limit}`;
      }
      rows = await this.executeSql(sql, values);
    }
    const result: T[] = [];
    for (let i = 0; i < rows.length; i++) {
      result.push(rows.item(i));
    }
    return result;
  }

  public async delete(query?: Partial<T>): Promise<void> {
    if (!query) {
      await this.executeSql(`DELETE FROM ${this.table}`).then(() =>
        this.emit('delete')
      );
    } else {
      const keys = Object.keys(query);
      const values = keys.map(k => (query as any)[k]);
      const sql = `DELETE FROM ${this.table} WHERE ${keys
        .map(k => `${k} = ?`)
        .join(' AND ')}`;
      await this.executeSql(sql, values).then(() => this.emit('delete'));
    }
  }

  public async update(doc: Partial<T>, ids: Partial<T>): Promise<void> {
    const docKeys = Object.keys(doc);
    const docValues = docKeys.map(k => (doc as any)[k]);
    const idsKeys = Object.keys(ids);
    const idsValues = idsKeys.map(k => (ids as any)[k]);

    const sql = `UPDATE ${this.table} SET ${docKeys
      .map(k => `${k} = ?`)
      .join(',')} WHERE ${idsKeys.map(k => `${k} = ?`).join(' AND ')}`;
    await this.executeSql(sql, [...docValues, ...idsValues]).then(() =>
      this.emit('update')
    );
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
