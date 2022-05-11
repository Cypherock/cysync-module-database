import { Db } from '../module2/database';
import Notification from '../models2/notification';

export class NotificationDb extends Db<Notification> {
  constructor() {
    super('notification');
    this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            _id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            type INTEGER NOT NULL,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL,
            isRead BOOLEAN NOT NULL,
            PRIMARY KEY (_id)
        )`);
  }

  public async getLast(): Promise<Notification | null> {
    const data = await this.getAll(
      {},
      {
        sort: '_id',
        order: 'desc',
        limit: 1
      }
    );
    if (data.length > 0) {
      return data[0];
    }
    return null;
  }

  public async markAllAsRead() {
    await this.update({ isRead: true }, { isRead: false });
  }
}
