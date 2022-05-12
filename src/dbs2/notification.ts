import { Db } from '../module2/database2';
import Notification from '../models2/notification';

export class NotificationDb extends Db<Notification> {
  constructor() {
    super('notification');
  }

  public async insertMany(notifications: Notification[]) {
    await this.db.bulkDocs(notifications);
  }

  public async getAll(perPageLimit = 3) {
    const res = await this.db.find({
      selector: {
        _id: { $gte: null }
      },
      sort: [{ _id: 'desc' }],
      limit: perPageLimit
    })

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
