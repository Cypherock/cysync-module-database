import { Database } from '../module/database';
import Notification from '../models/notification';

/**
 * NotificationDB stores the CySync notifications for Device updates, Cysync updates etc.
 *
 */
export class NotificationDB extends Database<Notification> {
  constructor() {
    super('notification', {
      databaseVersion: 'v2',
      indexedFields: ['createdAt']
    });
  }

  public async insert(notification: Notification) {
    await super.insert(notification);
  }

  public async getLatest(items = 3, skip = 0) {
    const res = await this.executeQuery(
      { createdAt: { $gte: null } },
      { field: 'createdAt', order: 'desc', limit: items, skip }
    );
    return res;
  }

  public async markAllAsRead() {
    await this.db.query(doc => {
      doc.isRead = true;
    });
  }
}
