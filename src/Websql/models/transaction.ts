import { InputOutput } from './inputOutput';
import IModel from './model';
export enum Status {
  PENDING,
  SUCCESS,
  FAILURE
}

export type SentReceive = 'SENT' | 'RECEIVED' | 'FEES';

// Amounts are in string, because for ETH it'll exceed JS Max Number
export default interface ITransaction extends IModel {
  hash: string;
  // Total is the total amount transferred in txn
  total?: string;
  // Fee in txn
  fees?: string;
  // Amount to display in txn list
  amount: string;
  confirmations: number;
  // walletId used by desktop app for a particular wallet
  walletId: string;
  // walletName of blockcypher api wallet created for each coin
  walletName?: string;
  slug: string;
  coin?: string;
  status: Status;
  sentReceive: SentReceive;
  confirmed: Date;
  blockHeight: number;
  inputs?: InputOutput[];
  outputs?: InputOutput[];
}
