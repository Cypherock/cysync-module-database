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

}