export default interface INotification {
  /**
   *  unique identifier determined by the server
   */
  _id: string;
  prevDbId?: string;
  dbId?: string;
  title: string;
  description?: string;
  type: number;
  createdAt: Date;
  isRead: boolean;
}
