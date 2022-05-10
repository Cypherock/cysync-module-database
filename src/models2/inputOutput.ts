export enum IOtype {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT'
}

export type InputOutput = {
  hash?: string;
  type: IOtype;
  address: string;
  value: string;
  isMine: boolean;
  indexNumber: number;
};
