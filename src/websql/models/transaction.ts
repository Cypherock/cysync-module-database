import { InputOutput } from './inputOutput';
import IModel from './model';
export enum Status {
  PENDING,
  SUCCESS,
  FAILURE
}

export enum SentReceive {
  SENT,
  RECEIVED,
  FEES
}

/**
 * A model to store the blockchain transactions. It has an optional inputs/outputs fields
 * for BTC-like Transactions where UTXOs are needed. For other networks like ETH, it would be empty/
 */
export default interface ITransaction extends IModel {
  accountId: string;
  /**
   * If a token txn: Coin Id of parent coin
   * If not a token txn: Coin Id of the coin
   */
  parentCoinId: string;

  /**
   * If a token txn: Coin Id of token
   * If not a token txn: Coin Id of the coin
   */
  coinId: string;

  /**
   * true if it's a token txn
   */
  isSub: boolean;

  hash: string;
  /**
   *  Total = amount transferred + fees
   */
  total?: string;
  fees?: string;
  /**
   * Transferred amount excluding fees
   */
  amount: string;
  confirmations: number;
  /**
   * walletId used by desktop app for a particular wallet
   */
  walletId: string;
  /**
   * walletName of blockcypher api wallet created for each coin
   */
  walletName?: string;
  /**
   * @deprecated
   * uniquer identifier of the crypto asset. Ex: ETH, BTC, USDT, etc.
   */
  slug?: string;
  /**
   * @deprecated
   * If it's a token transaction, then this would be the coin slug.
   * This is done so as to extend support to other crypto assets like NFTs automatically.
   */
  coin?: string;
  status: Status;
  sentReceive: SentReceive;
  /**
   * Tx creation date is stored here first. Once its confirmed on the blockchain it will be updated.
   */
  confirmed: string;
  blockHeight: number;
  inputs?: InputOutput[];
  outputs?: InputOutput[];
  blockedInputs?: number[];
  blockedAt?: Date;
  customIdentifier?: string;
  type?: string;
  description?: string;
}
