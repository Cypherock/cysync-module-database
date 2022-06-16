import { Database } from '../module/database';
import Transaction from '../models/transaction';
import { ALLCOINS } from '@cypherock/communication';

const PENDING_TO_FAIL_TIMEOUT_IN_HOURS = 1;

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
      indexedFields: ['confirmed', 'blockHeight', 'walletId', 'slug']
    });
  }

  public async insert(txn: Transaction) {
    txn._id = this.buildIndexString(txn.walletId, txn.slug, txn.hash);
    await super.insert(txn);
  }

  /**
   * Set all the pending txn waiting for confirmations to failure after specified time.
   */
  public async failExpiredTxn() {
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
  private isBtcFork(coinStr: string) {
    const coin = ALLCOINS[coinStr.toLowerCase()];
    if (!coin) {
      throw new Error('Invalid coin');
    }

    return !coin.isEth && !coin.isErc20Token;
  }
  public async blockUTXOS(utxos: any[], slug: string, walletId: string) {
    if (!this.isBtcFork(slug)) return;
    await Promise.all(
      utxos.map(async input => {
        await this.findAndUpdate(
          { hash: input.txId, slug, walletId },
          {
            blocked: true,
            blockedAt: new Date()
          }
        );
      })
    );
  }

  /**
   * Release all blocked txns if the 20 minutes has passed since the blockage.
   */
  public async releaseBlockedTxns(slug: string) {
    if (!this.isBtcFork(slug)) return;
    await this.db
      .find({
        selector: {
          blocked: true,
          blockedAt: {
            $lt: new Date(Date.now() - 20 * 60 * 1000)
          }
        }
      })
      .then(async results => {
        const updatedResults = results.docs.map(doc => {
          doc.blocked = false;
          doc.blockedAt = undefined;
          return doc;
        });
        this.db.bulkDocs(updatedResults);
      });
  }
}
