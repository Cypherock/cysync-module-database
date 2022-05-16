import IModel from "./model";

export default interface IDevice extends IModel {
  serial: string;
  version: string;
  isAuth: boolean;
}
