export default interface IModel {
  /**
   * _id decides the primary key of the table. And also serves as the key for indexing.
   */
  _id?: string;
  _rev?: string;
  isEncrypted?: IS_ENCRYPTED;
  databaseVersion?: string;
}

export enum IS_ENCRYPTED {
  NO = 0,
  YES = 1
}
