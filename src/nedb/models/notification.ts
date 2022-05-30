import IModel from './model';

export default interface INotification extends IModel {
  _id?: string;
  prevDbId?: string;
  dbId: string;
  title: string;
  description?: string;
  type: number;
  createdAt: Date;
  isRead: boolean;
}
