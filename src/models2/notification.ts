export default interface INotification {
  _id: string;
  title: string;
  description?: string;
  type: number;
  createdAt: Date;
  updatedAt: Date;
  isRead: boolean;
}
