import { Database } from '../module/database';
import Transaction, { SentReceive, Status } from '../models/transaction';
import BigNumber from 'bignumber.js';
import { InputOutput, IOtype } from '../models/inputOutput';
import { AddressDB } from './address';
import { ALLCOINS, ERC20TOKENS } from '@cypherock/communication';
import { utils } from 'ethers';
import logger from '../../utils/logger';

const PENDING_TO_FAIL_TIMEOUT_IN_HOURS = 24;

/**
 * TransactionDB stores the transactions data of all required blockchain transactions.
 * For BTC-like forks, it also stores the inputs and outputs. This would be essential in
 * building a transaction. For other networks, inputs and outputs are not required.
 */
export interface TxQuery {
  hash?: string;
  walletId?: string;
  walletName?: string;
  slug?: string;
  coin?: string;
  sentReceive?: SentReceive;
  status?: Status;
}
export interface TxQueryOptions {
  excludeFees?: boolean;
  excludeFailed?: boolean;
  excludePending?: boolean;
  sinceDate?: Date;
  minConfirmations?: number;
}

export class TransactionDB extends Database<Transaction> {
  public counter = 0;
  private fieldIndexMap = new Map<string, string>();
  constructor() {
    super('transactions', 'v1');
    // Index creation for sorting
    ['confirmed', 'blockHeight'].forEach(async field => {
      const response = await this.db.createIndex({
        index: {
          name: `idx-${field}`,
          fields: [field]
        }
      });
      this.fieldIndexMap.set(field, (response as any).id);
    });
  }

  public async insert(txn: Transaction) {
    txn._id = txn.confirmed + txn.blockHeight.toLocaleString() + txn.hash;
    await super.insert(txn);
  }

  /**
   * Gets all transactions from the local database.
   *
   * @return promise that resolves to a list of transactions
   */
  public async getAll(
    query: TxQuery,
    options?: TxQueryOptions,
    sorting?: {
      field: string;
      order: 'asc' | 'desc';
      limit?: number;
    }
  ) {
    let dbQuery: any = {};
    let innerQuery: any = {};
    const andQuery: any = [];

    if (sorting && !this.fieldIndexMap.has(sorting.field))
      throw new Error(
        `Couldn't find index for the provided sorting field ${sorting.field}`
      );

    if (options) {
      if (options.excludeFees) {
        delete options.excludeFees;
        andQuery.push({ $not: { sentReceive: 'FEES' } });
      }

      if (options.excludeFailed) {
        delete options.excludeFailed;
        andQuery.push({ $not: { status: 2 } });
      }

      if (options.excludePending) {
        delete options.excludePending;
        andQuery.push({ $not: { status: 0 } });
      }

      if (options.sinceDate) {
        innerQuery.confirmed = { $gt: options.sinceDate };
        delete options.sinceDate;
      }

      if (options.minConfirmations) {
        innerQuery.confirmations = { $gte: options.minConfirmations };
        delete options.minConfirmations;
      }
    }
    innerQuery = { ...innerQuery, ...query };
    // Sort field must be a part of the selector
    if (sorting?.field) innerQuery[sorting.field] = { $gte: null };

    if (andQuery.length > 0) {
      andQuery.push({ ...innerQuery });
      dbQuery.$and = andQuery;
    } else {
      dbQuery = { ...innerQuery };
    }

    if (sorting?.field) {
      if (sorting.limit) {
        return (
          await this.db.find({
            selector: dbQuery,
            limit: sorting.limit,
            use_index: this.fieldIndexMap.get(sorting.field),
            sort: [{ [sorting.field]: sorting.order }]
          })
        ).docs;
      }
      return (
        await this.db.find({
          selector: dbQuery,
          use_index: this.fieldIndexMap.get(sorting.field),
          sort: [{ [sorting.field]: sorting.order }]
        })
      ).docs;
    }
    return (await this.db.find({ selector: dbQuery })).docs;
  }

  /**
   * Set all the pending txn waiting for confirmations to failure after specified time.
   */
  public async failExpiredTxn() {
    // expire txns after 24 hours
    await this.db
      .find({
        selector: {
          status: 0,
          confirmed: {
            $lt: new Date(
              Date.now() - PENDING_TO_FAIL_TIMEOUT_IN_HOURS * 60 * 60 * 1000
            )
          }
        }
      })
      .then(async results => {
        const updatedResults = results.docs.map(doc => {
          doc.status = 2;
          return doc;
        });
        this.db.bulkDocs(updatedResults);
      });
  }

  public async getTopBlock(query: TxQuery, options: TxQueryOptions) {
    const res = await this.getAll(query, options, {
      field: 'blockHeight',
      order: 'desc',
      limit: 1
    });
    if (res.length === 0) return undefined;
    // return max block height
    return res[0].blockHeight;
  }
}
