import { Database } from '../module/database';
import Notification from '../models/notification';

/**
 * NotificationDB stores the CySync notifications for Device updates, Cysync updates etc.
 *
 */
export class NotificationDB extends Database<Notification> {
  constructor() {
    super('notification', { databaseVersion: 'v1' });
  }

  public async getLatest(items = 3, skip = 0) {
    const res = await this.db.find({
      selector: {
        _id: { $gte: null }
      },
      sort: [{ _id: 'desc' }],
      limit: items,
      skip
    });
    return res.docs;
  }

  public async markAllAsRead() {
    await this.db.query(doc => {
      doc.isRead = true;
    });
  }
}
