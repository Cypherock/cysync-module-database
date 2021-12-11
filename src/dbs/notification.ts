import { notification as NotificationServer } from '@cypherock/server-wrapper';
import Service from '../module/database';
import Notification from '../models/notification';

/**
 * Class for the Notification database. This database stores all the notifications.
 * @extends Service
 */
export default class NotificationDB extends Service<Notification> {
  /**
   *  Calls the super constructor with the database name.
   */
  constructor(userDataPath = '') {
    super('notifications', userDataPath, 'v1');
  }

  /**
   * Gets all notifications after the last one.
   *
   * We store additional field `prevDbId` to check if the sequence of the
   * notifications are corret in the database.
   *
   * If the sequence is not correct, then we fetch the notifications from
   * the server.
   *
   * @return promise that resolves to a list of notifications
   */
  public async getAll(
    last: Notification,
    totalLen: number = 0,
    items: number = 3
  ) {
    // Fetch notifications from database
    const dbNotif = await this.db
      .find({})
      .sort({ createdAt: -1 })
      .skip(totalLen)
      .limit(items)
      .exec();

    let isInDb = true;

    // Check if the data in DB is syncronized with the server
    if (dbNotif.length > 0) {
      if (dbNotif[0].prevDbId === last.dbId) {
        let prevNotif = dbNotif[0];
        for (let i = 1; i < dbNotif.length; i++) {
          const notif = dbNotif[i];
          if (notif.prevDbId !== prevNotif.dbId) {
            isInDb = false;
            break;
          }

          prevNotif = notif;
        }
      } else {
        isInDb = false;
      }
    } else {
      isInDb = false;
    }

    // Fetch from server if data is not syncronized.
    if (!isInDb) {
      const res = await NotificationServer.get(last.dbId, items);
      let serverLatestNotif = [];
      let hasNext: boolean;

      if (res.data.notifications) {
        serverLatestNotif = res.data.notifications;
        hasNext = res.data.hasNext;
      }

      const notifications = [];
      let prevNotif: Notification;
      for (const notifData of serverLatestNotif) {
        const notif: Notification = {
          dbId: notifData._id,
          title: notifData.title,
          description: notifData.description,
          type: notifData.type,
          createdAt: new Date(notifData.createdAt),
          isRead: false
        };

        if (prevNotif) {
          notif.prevDbId = prevNotif.dbId;
        } else if (last) {
          notif.prevDbId = last.dbId;
        }

        prevNotif = notif;

        notifications.push(notif);

        const alreadyPresent = await this.db.find({ dbId: notif.dbId }).exec();

        if (alreadyPresent.length === 0) {
          await this.db.update(
            { dbId: notif.dbId },
            this.createdDBObject(notif),
            { upsert: true }
          );
        }
      }

      return { notifications, hasNext };
    } else {
      // If data is from database then always show `hasNex` to allow user to
      // check from server at the end of the list.
      return {
        notifications: dbNotif,
        hasNext: true
      };
    }
  }

  /**
   * Gets latest notifications.
   *
   * @return promise that resolves to a list of notifications
   */
  public async getLatest(items: number = 3) {
    const dbNotif = await this.db
      .find({})
      .sort({ createdAt: -1 })
      .limit(items)
      .exec();

    const res = await NotificationServer.get(undefined, items);
    let serverLatestNotif = [];
    let hasNext = false;
    let hasUnread = false;

    if (res.data.notifications) {
      serverLatestNotif = res.data.notifications;
      hasNext = res.data.hasNext;
    }

    let prevNotif: Notification;
    for (const notifData of serverLatestNotif) {
      const notif: Notification = {
        dbId: notifData._id,
        title: notifData.title,
        description: notifData.description,
        type: notifData.type,
        createdAt: new Date(notifData.createdAt),
        isRead: false
      };

      if (prevNotif) {
        notif.prevDbId = prevNotif.dbId;
      }

      prevNotif = notif;

      const isInDb = await this.db.find({ dbId: notif.dbId }).exec();

      if (isInDb.length === 0) {
        await this.db.update(
          { dbId: notifData._id },
          this.createdDBObject(notif),
          { upsert: true }
        );
      }
    }

    // Has new notifications if lengths are different
    if (dbNotif.length < serverLatestNotif.length) {
      hasUnread = true;
    }

    // Has new notifications if first notifications are different
    if (
      !hasUnread &&
      dbNotif.length > 0 &&
      serverLatestNotif.length > 0 &&
      dbNotif[0].dbId !== serverLatestNotif[0]._id
    ) {
      hasUnread = true;
    }

    if (!hasUnread) {
      for (const notif of dbNotif) {
        if (!notif.isRead) {
          hasUnread = true;
          break;
        }
      }
    }

    return {
      notifications: await this.db
        .find({})
        .sort({ createdAt: -1 })
        .limit(items)
        .exec(),
      hasNext,
      hasUnread
    };
  }

  /**
   * Marks all notifications as read
   */
  public async markAllAsRead() {
    return this.db.update(
      { isRead: false },
      { $set: { isRead: true } },
      { multi: true }
    );
  }
}
