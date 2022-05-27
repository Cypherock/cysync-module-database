import { Database } from '../module/database';
import Transaction from '../models/transaction';

const PENDING_TO_FAIL_TIMEOUT_IN_HOURS = 24;

/**
 * TransactionDB stores the transactions data of all required blockchain transactions.
 * For BTC-like forks, it also stores the inputs and outputs. This would be essential in
 * building a transaction. For other networks, inputs and outputs are not required.
 */

export class TransactionDB extends Database<Transaction> {
  public counter = 0;
  constructor() {
    super('transactions', {
      databaseVersion: 'v1',
      indexedFields: ['confirmed', 'blockHeight']
    });
  }

  public async insert(txn: Transaction) {
    txn._id = txn.walletId + txn.hash + txn.slug + txn.sentReceive;
    await super.insert(txn);
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
}
