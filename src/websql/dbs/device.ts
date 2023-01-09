import { Database } from '../module/database';
import Device from '../models/device';

/**
 * DeviceDB stores the Cypherock X1 wallet device information.
 */
export class DeviceDB extends Database<Device> {
  constructor() {
    super('device', { databaseVersion: 'v1' });
  }

  public async insert(device: Device) {
    device._id = Database.buildIndexString(device.serial);
    await super.insert(device);
  }

  public async getBySerial(serial: string) {
    const res = await this.db.find({ selector: { serial } });
    if (res.docs.length === 0) {
      return null;
    }
    return res.docs[0];
  }
}
