export enum IOtype {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT'
}
/**
 * A model to store the linked inputs/outputs of BTC-like transactions.
 * Each transaction has multiple inputs and outputs. Refer Transaction Model for more info.
 */
export type InputOutput = {
  hash?: string;
  type: IOtype;
  address: string;
  value: string;
  isMine: boolean;
  indexNumber: number;
};
