import Service from '../module/database';
import Device from '../models/device';

/**
 * Class for the Device database. This db stores all the device which connect to destop app
 * with their corresponding serial, version & authState. This class also emits "insert", "delete"
 * event in case of these operations.
 */
export default class DeviceDB extends Service<Device> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch the latest balances.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '') {
    super('devices', userDataPath, 'v1');
  }

  /**
   * returns a promise which resolves to a list of all addresses in the database.
   */
  public getAll = () => {
    return this.db.find({}).exec();
  };

  /**
   * Returns a promise which resolves to the device details of the given serial in the database.
   * If not found, returns null.
   */
  public getBySerial = async (
    serial: string
  ): Promise<{
    version: string;
    serial: string;
    isAuth: boolean;
  } | null> => {
    const all = await this.db.find({ serial }).exec();
    if (all.length === 0) {
      return null;
    }
    const { version, serial: dbSerial, isAuth } = all[0];
    return { version, serial: dbSerial, isAuth };
  };

  /**
   * inserts a new Device in the database.
   * @param device - the Device object
   */
  public async insert(device: Device) {
    return this.db
      .update(
        {
          serial: device.serial
        },
        this.createdDBObject(device),
        {
          upsert: true
        }
      )
      .then(() => this.emit('insert'));
  }

  /**
   * deletes an Device object from the database using the serial.
   * @param serial - the serial
   */
  public async delete(serial: string) {
    return this.db.remove({ serial }).then(() => this.emit('delete'));
  }

  /**
   * deletes all the data from the database.
   */
  public async deleteAll() {
    return this.db.remove({}, { multi: true }).then(() => this.emit('delete'));
  }
}
