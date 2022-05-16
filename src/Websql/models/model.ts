export default interface IModel {
  /**
   * _id decides the primary key of the table. And also serves as the key for indexing.
   */
  _id?: string;
  _rev?: string;
  isEncrypted?: ISENCRYPTED;
  databaseVersion?: string;
}

export enum ISENCRYPTED {
  NO = 0,
  YES = 1
}
