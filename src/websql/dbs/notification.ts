import { Database } from '../module/database';
import Notification from '../models/notification';

/**
 * NotificationDB stores the CySync notifications for Device updates, Cysync updates etc.
 *
 */
export class NotificationDB extends Database<Notification> {
  constructor() {
    super('notification', 'v1');
  }

  public async get(perPageLimit = 3) {
    const res = await this.db.find({
      selector: {
        _id: { $gte: null }
      },
      sort: [{ _id: 'desc' }],
      limit: perPageLimit
    });

    return res.docs;
  }

  public async getNext(_id: string, perPageLimit = 3) {
    const res = await this.db.find({
      limit: perPageLimit,
      selector: {
        _id: { $lte: _id }
      },
      sort: [{ _id: 'desc' }]
    });
    return res.docs;
  }

  /**
   * This function is used to get the last notification in Db. So the client can pass this to
   * server and fetch all the latest notifications that are not present on client/
   * @returns {Promise<Notification>}
   */
  public async getLastId(): Promise<Notification | null> {
    const res = await this.db.find({
      selector: {
        _id: { $gte: null }
      },
      fields: ['_id'],
      sort: [{ _id: 'desc' }],
      limit: 1
    });
    if (res.docs.length === 0) {
      return null;
    }
    return res.docs[0];
  }

  public async markAllAsRead() {
    await this.db.query(doc => {
      doc.isRead = true;
    });
  }
}
