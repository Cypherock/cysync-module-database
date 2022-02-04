import { ALLCOINS, ERC20TOKENS } from '@cypherock/communication';
import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
import Service from '../module/database';
import Transaction, { InputOutput, SentReceive } from '../models/transaction';
import AddressDB from './address';
import logger from '../utils/logger';

const isBtcFork = (coinStr: string) => {
  const coin = ALLCOINS[coinStr.toLowerCase()];
  if (!coin) {
    throw new Error('Invalid coin');
  }

  return !coin.isEth && !coin.isErc20Token;
};

const PENDING_TO_FAIL_TIMEOUT_IN_HOURS = 24;

/**
 * Class for the Transactions database. This database stores all the past transactions of all coins.
 * This class also emits "insert", "delete", and "update" events in case of these operations.
 * @extends Service
 */
export default class TransactionDB extends Service<Transaction> {
  /**
   *  Calls the super constructor with the database name and the base URL to fetch last transactions.
   * (Could be cypherock server, or any other server)
   */
  constructor(userDataPath = '') {
    super('transactions', userDataPath, 'v1');
  }

  /**
   * Gets all transactions from the local database.
   *
   * @return promise that resolves to a list of transactions
   */
  public getAll = (
    query?: {
      walletId?: string;
      hash?: string;
      ethCoin?: string;
      sentReceive?: SentReceive;
      walletName?: string;
      coin?: string;
      excludeFees?: boolean;
      excludeFailed?: boolean;
      excludePending?: boolean;
      sinceDate?: Date;
      status?: 'PENDING' | 'SUCCESS' | 'FAILED';
      minConfirmations?: number;
    },
    sorting?: {
      sort: string;
      order?: 'a' | 'd';
      limit?: number;
    }
  ) => {
    let dbQuery: any = {};

    if (query) {
      let innerQuery: any = {};
      const andQuery: any = [];
      if (query.excludeFees) {
        delete query.excludeFees;
        andQuery.push({ $not: { sentReceive: 'FEES' } });
      }

      if (query.excludeFailed) {
        delete query.excludeFailed;
        const q = { $not: { status: 2 } };
        andQuery.push(q);
      }

      if (query.excludePending) {
        delete query.excludePending;
        const q = { $not: { status: 0 } };
        andQuery.push(q);
      }

      if (query.sinceDate) {
        innerQuery.confirmed = { $gt: query.sinceDate };
        delete query.sinceDate;
      }

      if (query.minConfirmations) {
        innerQuery.confirmations = { $gte: query.minConfirmations };
        delete query.minConfirmations;
      }

      if (query.status) {
        innerQuery.status =
          query.status === 'PENDING' ? 0 : query.status === 'SUCCESS' ? 1 : 2;
        delete query.status;
      }

      if (Object.keys(query).length > 0) {
        delete query.excludeFees;
        delete query.excludeFailed;
        delete query.sinceDate;
        innerQuery = { ...innerQuery, ...query };
      }

      if (Object.keys(innerQuery).length > 0) {
        if (andQuery.length > 0) {
          andQuery.push({ ...innerQuery });
          dbQuery.$and = andQuery;
        } else {
          dbQuery = { ...innerQuery };
        }
      } else {
        dbQuery.$and = andQuery;
      }
    }

    if (sorting) {
      if (sorting.limit) {
        return this.db
          .find(dbQuery)
          .sort({ [sorting.sort]: sorting.order === 'a' ? 1 : -1 })
          .limit(sorting.limit)
          .exec();
      }
      return this.db
        .find(dbQuery)
        .sort({ [sorting.sort]: sorting.order === 'a' ? 1 : -1 })
        .exec();
    }

    return this.db.find(dbQuery).exec();
  };

  /**
   * gets all transactions of a particular wallet
   * @param walletId - id of the wallet whose transactions are to be retrieved
   * @return promise that resolves to a list of transactions
   */
  public getByWalletId(walletId: string) {
    return this.db.find({ walletId });
  }

  /**
   * Inserts a new transaction to the database.
   * @param txn - Transaction
   */
  public insert(txn: Transaction) {
    return (
      this.db
        // txn hash cannot be unique because the same txn can be in different wallet
        .update(
          { walletId: txn.walletId, hash: txn.hash, coin: txn.coin },
          this.createdDBObject(txn),
          {
            upsert: true
          }
        )
        .then(() => this.emit('insert'))
    );
  }

  /**
   * Update the transaction confirmations.
   * @param txn - raw txn object
   * @reaturns - The number of confirmations
   */
  public async updateConfirmations(txn: any): Promise<number> {
    if (!txn.hash) {
      return 0;
    }

    if (txn.coinType === 'eth' || txn.coinType === 'ethr') {
      this.db
        .update(
          { hash: txn.hash.toLowerCase() },
          {
            $set: {
              status: txn.isError ? 2 : 1,
              confirmations: txn.confirmations || 0
            }
          },
          { multi: true }
        )
        .then(() => this.emit('insert'));

      return txn.confirmations || 0;
    } else {
      let status: number = 0;
      let hasConfirmation = false;

      if (
        txn.confirmations !== undefined &&
        txn.confirmations.confirmations !== null
      ) {
        hasConfirmation = true;
        if (txn.confirmations >= 1) {
          status = 1;
        }
      }

      if (hasConfirmation) {
        const updatedValues: any = { confirmations: txn.confirmations, status };
        if (txn.confirmed) {
          updatedValues.confirmed = new Date(txn.confirmed);
        }

        if (txn.block_height) {
          updatedValues.blockHeight = txn.block_height;
        }

        this.db
          .update(
            { hash: txn.hash },
            {
              $set: updatedValues
            },
            { multi: true }
          )
          .then(() => this.emit('insert'));
        return updatedValues.confirmations;
      } else if (txn.block_height) {
        const allTx = await this.db.find({ hash: txn.hash }).exec();
        if (allTx.length === 0) {
          return 0;
        }

        const transaction = allTx[0];
        if (
          transaction &&
          transaction.blockHeight &&
          transaction.blockHeight !== -1
        ) {
          const confirmations = txn.block_height - transaction.blockHeight + 1;
          this.db.update(
            { hash: txn.hash },
            { $set: { confirmations, status: confirmations >= 1 ? 1 : 0 } },
            { multi: true }
          );
          return confirmations;
        }
      }
    }

    return 0;
  }

  /**
   * Inserts or updates the transaction in the database from the given full Txn.
   */
  public async insertFromFullTxn(transaction: {
    txn: any;
    xpub: string;
    addresses: any[];
    walletId: string;
    coinType: string;
    addressDB: AddressDB;
    walletName?: string;
    status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  }) {
    const {
      txn,
      xpub,
      addresses,
      walletId,
      walletName,
      coinType,
      addressDB,
      status
    } = transaction;

    let statusCode: number;

    if (status) {
      statusCode = status === 'PENDING' ? 0 : status === 'SUCCESS' ? 1 : 2;
    } else {
      if (txn.confirmations && txn.confirmations >= 1) {
        statusCode = 1;
      } else {
        statusCode = 0;
      }
    }

    if (isBtcFork(coinType)) {
      let myAddresses: string[] = [];

      if (addresses && addresses.length > 0) {
        myAddresses = addresses;
      }

      // Get all addresses of that xpub and coin
      // This is because the address from the API is of only 1 wallet,
      // Whereas there are 2 (or 4 in case od BTC & BTCT) wallets.
      const addressFromDB = await addressDB.getAll({ xpub, coinType });

      if (addressFromDB && addressFromDB.length > 0) {
        myAddresses = myAddresses.concat(
          addressFromDB.map((elem) => elem.address)
        );
      }

      let inputs: InputOutput[] = [];
      let outputs: InputOutput[] = [];
      let totalValue = new BigNumber(0);
      let sentReceive: SentReceive;

      if (txn.inputs && txn.inputs.length > 0) {
        inputs = txn.inputs.map((elem: any, i: number) => {
          return {
            address: elem.addresses ? elem.addresses[0] : '',
            value: String(elem.output_value),
            index: i,
            isMine: elem.addresses
              ? myAddresses.includes(elem.addresses[0])
              : false
          } as InputOutput;
        });
      }

      if (txn.outputs && txn.outputs.length > 0) {
        outputs = txn.outputs.map((elem: any, i: number) => {
          return {
            address: elem.addresses ? elem.addresses[0] : '',
            value: String(elem.value),
            index: i,
            isMine: elem.addresses
              ? myAddresses.includes(elem.addresses[0])
              : false
          } as InputOutput;
        });
      }

      const existingTxns = await this.db
        .find({
          hash: txn.hash,
          walletId,
          coin: coinType
        })
        .exec();

      if (existingTxns && existingTxns.length > 0) {
        const existingTxn = existingTxns[0];
        const prevInputs = existingTxn.inputs;
        const prevOutputs = existingTxn.outputs;

        if (prevInputs && prevInputs.length > 0) {
          for (const input of prevInputs) {
            const index = inputs.findIndex(
              (elem) => elem.index === input.index
            );

            if (input.isMine) {
              inputs[index].isMine = true;
            }
          }
        }

        if (prevOutputs && prevOutputs.length > 0) {
          for (const output of prevOutputs) {
            const index = outputs.findIndex(
              (elem) => elem.index === output.index
            );

            if (output.isMine) {
              outputs[index].isMine = true;
            }
          }
        }
      }

      for (const input of inputs) {
        if (input.isMine) {
          totalValue = totalValue.minus(new BigNumber(input.value));
        }
      }

      for (const output of outputs) {
        if (output.isMine) {
          totalValue = totalValue.plus(new BigNumber(output.value));
        }
      }

      if (totalValue.isGreaterThan(0)) {
        sentReceive = 'RECEIVED';
      } else {
        sentReceive = 'SENT';
        totalValue = totalValue.plus(new BigNumber(txn.fees));
      }

      const newTxn: Transaction = {
        hash: txn.hash,
        total: String(txn.total),
        fees: String(txn.fees),
        amount: totalValue.absoluteValue().toString(),
        confirmations: txn.confirmations || 0,
        walletId,
        walletName,
        coin: coinType,
        sentReceive,
        status: statusCode,
        confirmed: new Date(txn.confirmed),
        blockHeight: txn.block_height,
        inputs,
        outputs
      };

      // Update the confirmations of txns with same hash
      await this.db.update(
        { hash: txn.hash },
        {
          $set: {
            confirmations: newTxn.confirmations,
            blockHeight: newTxn.blockHeight,
            status: newTxn.status
          }
        }
      );
      await this.insert(newTxn);
      this.emit('insert');
    } else {
      // Derive address from Xpub (It'll always give a mixed case address with checksum)
      const myAddress =
        utils.HDNode.fromExtendedKey(xpub).derivePath(`0/0`).address;

      const amount = new BigNumber(txn.value);
      const fromAddr = txn.from;
      const inputs: InputOutput[] = [
        {
          address: txn.from.toLowerCase(),
          value: amount.toString(),
          isMine: txn.from.toLowerCase() === myAddress.toLowerCase(),
          index: 0
        }
      ];
      const outputs: InputOutput[] = [
        {
          address: txn.to.toLowerCase(),
          value: amount.toString(),
          isMine: txn.to.toLowerCase() === myAddress.toLowerCase(),
          index: 0
        }
      ];

      let token: string | undefined;

      const fees = new BigNumber(txn.gasUsed || txn.gas || 0).multipliedBy(
        txn.gasPrice || 0
      );

      if (txn.isErc20Token) {
        token = txn.tokenAbbr;

        if (!token) {
          logger.warn('Token abbr is not present in ERC20 Transaction');
          return;
        }

        if (!ERC20TOKENS[token]) {
          logger.warn('Invalid tokenAbbr in transaction', { token });
          return;
        }

        const feeTxn: Transaction = {
          hash: txn.hash,
          amount: fees.toString(),
          fees: '0',
          total: fees.toString(),
          confirmations: txn.confirmations || 0,
          walletId,
          coin: coinType,
          // 2 for failed, 1 for pass
          status: txn.isError ? 2 : 1,
          sentReceive: 'FEES',
          confirmed: new Date(txn.timeStamp),
          blockHeight: txn.blockNumber,
          ethCoin: coinType,
          inputs: [],
          outputs: []
        };

        await this.insert(feeTxn);
      }

      const newTxn: Transaction = {
        hash: txn.hash,
        amount: amount.toString(),
        fees: fees.toString(),
        total: token ? amount.toString() : amount.plus(fees).toString(),
        confirmations: txn.confirmations || 0,
        walletId,
        coin: token ? token : coinType,
        // 2 for failed, 1 for pass
        status: txn.isError ? 2 : 1,
        sentReceive:
          myAddress.toLowerCase() === fromAddr.toLowerCase()
            ? 'SENT'
            : 'RECEIVED',
        confirmed: new Date(txn.timeStamp),
        blockHeight: txn.blockNumber,
        ethCoin: coinType,
        inputs,
        outputs
      };

      await this.insert(newTxn);
    }
  }

  public async insertFromBlockbookTxn(transaction: {
    txn: any;
    xpub: string;
    addresses: any[];
    walletId: string;
    coinType: string;
    addressDB: AddressDB;
    walletName?: string;
    status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  }) {
    const {
      txn,
      xpub,
      addresses,
      walletId,
      walletName,
      coinType,
      addressDB,
      status
    } = transaction;

    let statusCode: number;

    if (status) {
      statusCode = status === 'PENDING' ? 0 : status === 'SUCCESS' ? 1 : 2;
    } else {
      if (txn.confirmations && txn.confirmations >= 1) {
        statusCode = 1;
      } else {
        statusCode = 0;
      }
    }

    if (isBtcFork(coinType)) {
      let myAddresses: string[] = [];

      if (addresses && addresses.length > 0) {
        myAddresses = addresses;
      }

      // Get all addresses of that xpub and coin
      // This is because the address from the API is of only 1 wallet,
      // Whereas there are 2 (or 4 in case od BTC & BTCT) wallets.
      const addressFromDB = await addressDB.getAll({ xpub, coinType });

      if (addressFromDB && addressFromDB.length > 0) {
        myAddresses = myAddresses.concat(
          addressFromDB.map((elem) => elem.address)
        );
      }

      let inputs: InputOutput[] = [];
      let outputs: InputOutput[] = [];
      let totalValue = new BigNumber(0);
      let sentReceive: SentReceive;

      if (txn.vin && txn.vin.length > 0) {
        inputs = txn.vin.map((elem: any, i: number) => {
          return {
            address: elem.isAddress && elem.addresses ? elem.addresses[0] : '',
            value: String(elem.value),
            index: i,
            isMine:
              elem.isAddress && elem.addresses
                ? myAddresses.includes(elem.addresses[0])
                : false
          } as InputOutput;
        });
      }

      if (txn.vout && txn.vout.length > 0) {
        outputs = txn.vout.map((elem: any, i: number) => {
          return {
            address: elem.isAddress && elem.addresses ? elem.addresses[0] : '',
            value: String(elem.value),
            index: i,
            isMine:
              elem.isAddress && elem.addresses
                ? myAddresses.includes(elem.addresses[0])
                : false
          } as InputOutput;
        });
      }

      const existingTxns = await this.db
        .find({
          hash: txn.txid,
          walletId,
          coin: coinType
        })
        .exec();

      if (existingTxns && existingTxns.length > 0) {
        const existingTxn = existingTxns[0];
        const prevInputs = existingTxn.inputs;
        const prevOutputs = existingTxn.outputs;

        if (prevInputs && prevInputs.length > 0) {
          for (const input of prevInputs) {
            const index = inputs.findIndex(
              (elem) => elem.index === input.index
            );

            if (input.isMine) {
              inputs[index].isMine = true;
            }
          }
        }

        if (prevOutputs && prevOutputs.length > 0) {
          for (const output of prevOutputs) {
            const index = outputs.findIndex(
              (elem) => elem.index === output.index
            );

            if (output.isMine) {
              outputs[index].isMine = true;
            }
          }
        }
      }

      for (const input of inputs) {
        if (input.isMine) {
          totalValue = totalValue.minus(new BigNumber(input.value));
        }
      }

      for (const output of outputs) {
        if (output.isMine) {
          totalValue = totalValue.plus(new BigNumber(output.value));
        }
      }

      if (totalValue.isGreaterThan(0)) {
        sentReceive = 'RECEIVED';
      } else {
        sentReceive = 'SENT';
        totalValue = totalValue.plus(new BigNumber(txn.fees));
      }

      let confirmed = new Date();

      if (txn.blockTime) {
        confirmed = new Date(txn.blockTime * 1000);
      }

      const newTxn: Transaction = {
        hash: txn.txid,
        total: String(txn.value),
        fees: String(txn.fees),
        amount: totalValue.absoluteValue().toString(),
        confirmations: txn.confirmations || 0,
        walletId,
        walletName,
        coin: coinType,
        sentReceive,
        status: statusCode,
        confirmed,
        blockHeight: txn.blockHeight,
        inputs,
        outputs
      };

      // Update the confirmations of txns with same hash
      await this.db.update(
        { hash: txn.txid },
        {
          $set: {
            confirmations: newTxn.confirmations,
            blockHeight: newTxn.blockHeight,
            status: newTxn.status
          }
        }
      );
      await this.insert(newTxn);
      this.emit('insert');
    } else {
      // Derive address from Xpub (It'll always give a mixed case address with checksum)
      const myAddress =
        utils.HDNode.fromExtendedKey(xpub).derivePath(`0/0`).address;

      const amount = new BigNumber(txn.value);
      const fromAddr = txn.from;
      const inputs: InputOutput[] = [
        {
          address: txn.from.toLowerCase(),
          value: amount.toString(),
          isMine: txn.from.toLowerCase() === myAddress.toLowerCase(),
          index: 0
        }
      ];
      const outputs: InputOutput[] = [
        {
          address: txn.to.toLowerCase(),
          value: amount.toString(),
          isMine: txn.to.toLowerCase() === myAddress.toLowerCase(),
          index: 0
        }
      ];

      let token: string | undefined;

      const fees = new BigNumber(txn.gasUsed || txn.gas || 0).multipliedBy(
        txn.gasPrice || 0
      );

      if (txn.isErc20Token) {
        token = txn.tokenAbbr;

        if (!token) {
          logger.warn('Token abbr is not present in ERC20 Transaction');
          return;
        }

        if (!ERC20TOKENS[token]) {
          logger.warn('Invalid tokenAbbr in transaction', { token });
          return;
        }

        const feeTxn: Transaction = {
          hash: txn.hash,
          amount: fees.toString(),
          fees: '0',
          total: fees.toString(),
          confirmations: txn.confirmations || 0,
          walletId,
          coin: coinType,
          // 2 for failed, 1 for pass
          status: txn.isError ? 2 : 1,
          sentReceive: 'FEES',
          confirmed: new Date(txn.timeStamp),
          blockHeight: txn.blockNumber,
          ethCoin: coinType,
          inputs: [],
          outputs: []
        };

        await this.insert(feeTxn);
      }

      const newTxn: Transaction = {
        hash: txn.hash,
        amount: amount.toString(),
        fees: fees.toString(),
        total: token ? amount.toString() : amount.plus(fees).toString(),
        confirmations: txn.confirmations || 0,
        walletId,
        coin: token ? token : coinType,
        // 2 for failed, 1 for pass
        status: txn.isError ? 2 : 1,
        sentReceive:
          myAddress.toLowerCase() === fromAddr.toLowerCase()
            ? 'SENT'
            : 'RECEIVED',
        confirmed: new Date(txn.timeStamp),
        blockHeight: txn.blockNumber,
        ethCoin: coinType,
        inputs,
        outputs
      };

      await this.insert(newTxn);
    }
  }

  /**
   * deletes all transactions for a particular coin of a particular wallet
   * @param walletId - id of the wallet whose transactions are to be deleted
   * @param coin - coin abbr of the coin whose transactions are to be deleted
   */
  public async deleteByCoin(walletId: string, coin: string) {
    return this.db.remove({ walletId, coin }, { multi: true }).then(() => {
      this.emit('delete');
    });
  }

  /**
   * deletes a particular transaction by it's hash
   * @param hash
   */
  public async delete(hash: string) {
    return this.db.remove({ hash }).then(() => this.emit('delete'));
  }

  /**
   * deletes all transactions of a particular wallet
   * @param walletId - id of the wallet whose transactions are to be deleted.
   */
  public async deleteWallet(walletId: string) {
    return this.db
      .remove({ walletId }, { multi: true })
      .then(() => this.emit('delete'));
  }

  /**
   * deletes all the transactions form the database
   */
  public async deleteAll() {
    return this.db.remove({}, { multi: true }).then(() => this.emit('delete'));
  }

  /**
   * Set all the pending txn waiting for confirmations to failure after specified time.
   */
  public async failExpiredTxn() {
    await this.db.update(
      {
        confirmed: {
          $lt: new Date(
            Date.now() - PENDING_TO_FAIL_TIMEOUT_IN_HOURS * 60 * 60 * 1000
          )
        },
        status: 0
      },
      { $set: { status: 2 } },
      { multi: true }
    );
  }
}
