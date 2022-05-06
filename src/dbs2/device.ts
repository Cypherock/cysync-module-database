import { Db } from '../module2/database';
import Device from '../models2/device';

export class DeviceDb extends Db<Device> {

    constructor() {
        super('device');
        this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            serial TEXT NOT NULL,
            version TEXT NOT NULL,
            isAuth BOOLEAN NOT NULL,
            PRIMARY KEY (serial)
        )`);
    }

    public async get(serial: string) : Promise<Device | null> {
        const rows = await this.executeSql(`SELECT * FROM ${this.table} WHERE serial = ?`, [serial]);
        if (rows.length === 0) {
            return null;
        }
        return rows.item(0);
    }

    public async delete(serial: string) {
        await this.executeSql(`DELETE FROM ${this.table} WHERE serial = ?`, [serial]);
    }
}