export default interface IModel {
  _id?: string;
  _rev?: string;
  isEncrypted?: ISENCRYPTED;
  databaseVersion?: string;
}

export enum ISENCRYPTED {
  NO = 0,
  YES = 1
}
