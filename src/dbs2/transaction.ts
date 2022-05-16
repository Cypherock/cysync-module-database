import { Db } from '../module2/database2';
import Transaction, { SentReceive, Status } from '../models2/transaction';
import BigNumber from 'bignumber.js';
import { InputOutput, IOtype } from '../models2/inputOutput';
import { SendAddressDb } from './sendAddress';
import { ALLCOINS, ERC20TOKENS } from '@cypherock/communication';
import { utils } from 'ethers';
import logger from '../utils/logger';
import { Transaction2 } from '../models2';

const isBtcFork = (coinStr: string) => {
  const coin = ALLCOINS[coinStr.toLowerCase()];
  if (!coin) {
    throw new Error('Invalid coin');
  }

  return !coin.isEth && !coin.isErc20Token;
};

const PENDING_TO_FAIL_TIMEOUT_IN_HOURS = 24;

export interface TxQueryOptions extends Partial<Omit<Transaction, 'status'>> {
  excludeFees?: boolean;
  sinceDate?: Date;
  excludeFailed?: boolean;
  excludePending?: boolean;
  minConfirmations?: number;
  statusMessage?: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export class TransactionDb extends Db<Transaction> {
  public counter = 0;
  constructor() {
    super('transactions', 'v1');
    this.db.createIndex({
      index: {
        name: 'idx-confirmed',
        fields: ['confirmed']
      }
    });
    this.db.createIndex({
      index: {
        name: 'idx-confirmations',
        fields: ['confirmations']
      }
    });
  }

  public async insert(txn: Transaction) {
    txn._id = [txn.confirmed, txn.confirmations, txn.hash].join('/');
    await super.insert(txn);
  }

  /**
   * Gets all transactions from the local database.
   *
   * @return promise that resolves to a list of transactions
   */
  public async getAllTxns(
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
      indexName: 'idx-confirmed';
      field: 'confirmed';
      limit?: number;
    }
  ) {
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
    if (sorting?.indexName) {
      if (sorting.limit) {
        return (
          await this.db.find({
            selector: dbQuery,
            use_index: sorting.indexName,
            limit: sorting.limit,
            sort: [{ [sorting.field]: 'desc' }]
          })
        ).docs;
      }
      return (
        await this.db.find({
          selector: dbQuery,
          use_index: sorting.indexName,
          sort: [{ [sorting.field]: 'desc' }]
        })
      ).docs;
    }
    return (await this.db.find({ selector: dbQuery })).docs;
  }

  public async insertFromFullTxn(transaction: {
    txn: any;
    xpub: string;
    addresses: any[];
    walletId: string;
    coinType: string;
    sendAddressDB: SendAddressDb;
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
      sendAddressDB,
      status
    } = transaction;

    let statusCode: Status;

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
      const addressFromDB = await sendAddressDB.getAll({ walletId, coinType });

      if (addressFromDB && addressFromDB.length > 0) {
        myAddresses = myAddresses.concat(
          addressFromDB.map(elem => {
            if (elem?.address) return elem.address;
            return '';
          })
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
            indexNumber: i,
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
            indexNumber: i,
            isMine: elem.addresses
              ? myAddresses.includes(elem.addresses[0])
              : false
          } as InputOutput;
        });
      }

      const existingTxns = await this.getAll({
        hash: txn.hash,
        walletId,
        coin: coinType
      });

      if (existingTxns && existingTxns.length > 0) {
        const existingTxn = existingTxns[0];
        const prevInputs = existingTxn.inputs;
        const prevOutputs = existingTxn.outputs;

        if (prevInputs && prevInputs.length > 0) {
          for (const input of prevInputs) {
            const index = inputs.findIndex(
              elem => elem.indexNumber === input.indexNumber
            );

            if (input.isMine) {
              inputs[index].isMine = true;
            }
          }
        }

        if (prevOutputs && prevOutputs.length > 0) {
          for (const output of prevOutputs) {
            const index = outputs.findIndex(
              elem => elem.indexNumber === output.indexNumber
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
        slug: coinType,
        sentReceive,
        status: statusCode,
        confirmed: new Date(txn.confirmed),
        blockHeight: txn.block_height,
        inputs,
        outputs
      };

      // Update the confirmations of txns with same hash
      await this.findAndUpdate(
        { hash: txn.hash, walletId: walletId },
        {
          confirmations: newTxn.confirmations,
          blockHeight: newTxn.blockHeight,
          status: newTxn.status
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
          indexNumber: 0,
          type: IOtype.INPUT
        }
      ];
      const outputs: InputOutput[] = [
        {
          address: txn.to.toLowerCase(),
          value: amount.toString(),
          isMine: txn.to.toLowerCase() === myAddress.toLowerCase(),
          indexNumber: 0,
          type: IOtype.OUTPUT
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
          slug: coinType,
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
        slug: token ? token : coinType,
        // 2 for failed, 1 for pass
        status: txn.isError ? 2 : 1,
        sentReceive:
          myAddress.toLowerCase() === fromAddr.toLowerCase()
            ? 'SENT'
            : 'RECEIVED',
        confirmed: new Date(txn.timeStamp),
        blockHeight: txn.blockNumber,
        coin: coinType,
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
    sendAddressDB: SendAddressDb;
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
      sendAddressDB,
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
      const addressFromDB = await sendAddressDB.getAll({ walletId, coinType });

      if (addressFromDB && addressFromDB.length > 0) {
        myAddresses = myAddresses.concat(
          addressFromDB.map(elem => {
            if (elem) return elem.address;
            return '';
          })
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
            indexNumber: i,
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
            indexNumber: i,
            isMine:
              elem.isAddress && elem.addresses
                ? myAddresses.includes(elem.addresses[0])
                : false
          } as InputOutput;
        });
      }

      const existingTxns = await this.getAll({
        hash: txn.txid,
        walletId,
        coin: coinType
      });

      if (existingTxns && existingTxns.length > 0) {
        const existingTxn = existingTxns[0];
        const prevInputs = existingTxn.inputs;
        const prevOutputs = existingTxn.outputs;

        if (prevInputs && prevInputs.length > 0) {
          for (const input of prevInputs) {
            const index = inputs.findIndex(
              elem => elem.indexNumber === input.indexNumber
            );

            if (input.isMine) {
              inputs[index].isMine = true;
            }
          }
        }

        if (prevOutputs && prevOutputs.length > 0) {
          for (const output of prevOutputs) {
            const index = outputs.findIndex(
              elem => elem.indexNumber === output.indexNumber
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

      const newTxn: Transaction2 = {
        hash: txn.txid,
        total: String(txn.value),
        fees: String(txn.fees),
        amount: totalValue.absoluteValue().toString(),
        confirmations: txn.confirmations || 0,
        walletId,
        walletName,
        slug: coinType,
        sentReceive,
        status: statusCode,
        confirmed,
        blockHeight: txn.blockHeight,
        inputs,
        outputs
      };

      // Update the confirmations of txns with same hash
      if (existingTxns && existingTxns.length > 0) {
        await this.findAndUpdate(
          {
            confirmations: newTxn.confirmations,
            blockHeight: newTxn.blockHeight,
            status: newTxn.status
          },
          { hash: txn.txid, walletId }
        );
      }
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
          indexNumber: 0,
          type: IOtype.INPUT
        }
      ];
      const outputs: InputOutput[] = [
        {
          address: txn.to.toLowerCase(),
          value: amount.toString(),
          isMine: txn.to.toLowerCase() === myAddress.toLowerCase(),
          indexNumber: 0,
          type: IOtype.OUTPUT
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
          slug: coinType,
          // 2 for failed, 1 for pass
          status: txn.isError ? 2 : 1,
          sentReceive: 'FEES',
          confirmed: new Date(txn.timeStamp),
          blockHeight: txn.blockNumber,
          coin: coinType,
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
        slug: token ? token : coinType,
        // 2 for failed, 1 for pass
        status: txn.isError ? 2 : 1,
        sentReceive:
          myAddress.toLowerCase() === fromAddr.toLowerCase()
            ? 'SENT'
            : 'RECEIVED',
        confirmed: new Date(txn.timeStamp),
        blockHeight: txn.blockNumber,
        coin: coinType,
        inputs,
        outputs
      };

      await this.insert(newTxn);
    }
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
      this.findAndUpdate(
        { hash: txn.hash.toLowerCase() },
        {
          status: txn.isError ? 2 : 1,
          confirmations: txn.confirmations || 0
        }
      ).then(() => this.emit('insert'));

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

        this.findAndUpdate({ hash: txn.hash }, updatedValues).then(() => {
          this.emit('update');
        });
        return updatedValues.confirmations;
      } else if (txn.block_height) {
        const allTx = await this.getAll({ hash: txn.hash });
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
          this.findAndUpdate(
            { hash: txn.hash },
            { confirmations, status: confirmations >= 1 ? 1 : 0 }
          );
          return confirmations;
        }
      }
    }

    return 0;
  }

  public async getTopBlock(query: TxQueryOptions) {
    const res = await this.getAllTxns(query);
    if (res.length === 0) return undefined;
    // find max block height
    const maxBlockHeight = res.reduce((acc, curr) => {
      return acc > curr.blockHeight ? acc : curr.blockHeight;
    }, res[0].blockHeight);
    return maxBlockHeight;
  }
}
