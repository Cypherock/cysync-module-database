import { Database } from '../module/database';
import Device from '../models/device';

export class DeviceDb extends Database<Device> {
  constructor() {
    super('device', 'v1');
  }

  public async getBySerial(serial: string) {
    const res = await this.db.find({ selector: { serial } });
    if (res.docs.length === 0) {
      return null;
    }
    return res.docs[0];
  }
}
