import { Db } from '../module2/database2';
import Device from '../models2/device';

export class DeviceDb extends Db<Device> {
  constructor() {
    super('device');
  }



  public async getBySerial(serial: string) {
    const res = await this.db.find({ selector: { serial } });
    if (res.docs.length === 0) {
      return null;
    }
    return res.docs[0];
  }
}
