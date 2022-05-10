export default interface INotification {
  _id?: string;
  prevDbId?: string;
  dbId: string;
  title: string;
  description?: string;
  type: number;
  createdAt: Date;
  isRead: boolean;
}
