import openDatabase from 'websql';

export abstract class Db<T> {
    public table: string;
    protected db: Database;

    constructor(table: string) {
        this.table = table;
        this.db = openDatabase('Cypherock', '1.0', `Database storage for Cypherock`, 5 * 1024 * 1024);
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
        await this.executeSql(sql, values);
    }

    public async get(id: string): Promise<T | null> {
        const rows = await this.executeSql(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return null;
        }
        return rows.item(0);
    }

    public async getAll(): Promise<T[]> {
        const rows = await this.executeSql(`SELECT * FROM ${this.table}`);
        const result: T[] = [];
        for (let i = 0; i < rows.length; i++) {
            result.push(rows.item(i));
        }
        return result;
    }

    public async delete(id: any): Promise<void> {
        await this.executeSql(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    }

}