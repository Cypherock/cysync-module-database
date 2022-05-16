export default interface INotification {
  /**
   *  unique identifier determined by the server
   *  */
  _id: string; 
  title: string;
  description?: string;
  type: number;
  createdAt: Date;
  updatedAt: Date;
  isRead: boolean;
}
