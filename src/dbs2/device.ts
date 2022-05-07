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

  public transform(d: Device): Device {
    d.isAuth = d.isAuth === true;
    return d;
  }

  public async getOne(query: Partial<Device>): Promise<Device | null> {
    const device = await super.getOne(query);
    if (device) return this.transform(device);
    return null;
  }

  public async getAll(query?: Partial<Device>): Promise<Device[]> {
    const devices = await super.getAll(query);
    return devices.map(d => this.transform(d));
  }
}
