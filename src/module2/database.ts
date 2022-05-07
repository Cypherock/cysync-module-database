import { EventEmitter } from 'events';

export abstract class Db<T> {
    public table: string;
    protected db: Database;
    public emitter = new EventEmitter();

    constructor(table: string) {
        this.table = table;
        this.db = window.openDatabase('Cypherock', '1.0', `Database storage for Cypherock`, 5 * 1024 * 1024);
    }

    public executeSql(sql: string, params?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.transaction(function (t: SQLTransaction) {
                t.executeSql(sql, params, (_, r) => {
                    resolve(r.rows);
                }, (_, e) => {
                    reject(e);
                    return false;
                });
            });
        });
    };

    public async insert(doc: T): Promise<void> {
        const keys = Object.keys(doc);
        const values = keys.map(k => (doc as any)[k]);
        const sql = `INSERT INTO ${this.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
        await this.executeSql(sql, values).then(() => this.emit('insert'));
        ;
    }

    public async get(id: string): Promise<T | null> {
        const rows = await this.executeSql(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return null;
        }
        return rows.item(0);
    }

    public async getOne(query: Partial<T>): Promise<T | null> {
        const keys = Object.keys(query);
        const values = keys.map(k => (query as any)[k]);
        const sql = `SELECT * FROM ${this.table} WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}`;
        const rows = await this.executeSql(sql, values);
        if (rows.length === 0) {
            return null;
        }
        return rows.item(0);
    }

    public async getAll(query?: Partial<T>): Promise<T[]> {
        let rows;
        if (!query) {
            rows = await this.executeSql(`SELECT * FROM ${this.table}`);
        } else {
            const keys = Object.keys(query);
            const values = keys.map(k => (query as any)[k]);
            const sql = `SELECT * FROM ${this.table} WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}`;
            rows = await this.executeSql(sql, values);
        }
        const result: T[] = [];
        for (let i = 0; i < rows.length; i++) {
            result.push(rows.item(i));
        }
        return result;
    }

    public async delete(id: any): Promise<void> {
        await this.executeSql(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    }

    public async update(id: string, doc: T): Promise<void> {
        const keys = Object.keys(doc);
        const values = keys.map(k => (doc as any)[k]);
        const sql = `UPDATE ${this.table} SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`;
        await this.executeSql(sql, [...values, id]);
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