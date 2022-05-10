import { Db } from '../module2/database';
import Transaction, { SentReceive } from '../models2/transaction';
import BigNumber from 'bignumber.js';
import { InputOutputDb } from '../dbs2/inputOutput';
import { InputOutput, IOtype } from '../models2/inputOutput';
import { SendAddressDb } from './sendAddress';
import { Status } from '../models';
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

interface TxQueryOptions extends Partial<Transaction> {
  excludeFees?: boolean;
  sinceDate?: Date;
  excludeFailed?: boolean;
  excludePending?: boolean;
  minConfirmations?: number;
  statusMessage?: string;
}

export class TransactionDb extends Db<Transaction> {
  inputOutput: InputOutputDb;
  public counter = 0;
  constructor() {
    super('transactions');
    this.inputOutput = new InputOutputDb();
    this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            hash TEXT NOT NULL,
            total TEXT,
            fees TEXT,
            amount TEXT NOT NULL,
            confirmations INTEGER NOT NULL,
            walletId TEXT NOT NULL,
            walletName TEXT NOT NULL,
            slug TEXT NOT NULL,
            coin TEXT,
            status INTEGER NOT NULL,
            sentReceive TEXT NOT NULL,
            confirmed DATETIME NOT NULL,
            blockHeight INTEGER NOT NULL,
            PRIMARY KEY (hash, walletId, slug, sentReceive)
        )`);
  }

  private async insertIOs(
    inputs: InputOutput[] | undefined,
    outputs: InputOutput[] | undefined,
    hash: string
  ) {
    await Promise.allSettled([
      inputs &&
        Promise.allSettled(
          inputs.map(input => {
            input.hash = hash;
            input.type = IOtype.INPUT;
            return this.inputOutput.insert(input);
          })
        ),
      outputs &&
        Promise.allSettled(
          outputs.map(output => {
            output.hash = hash;
            output.type = IOtype.OUTPUT;
            return this.inputOutput.insert(output);
          })
        )
    ]);
  }

  public async insert(txn: Transaction) {
    await this.insertIOs(txn.inputs, txn.outputs, txn.hash);
    delete txn.inputs;
    delete txn.outputs;
    // Inserting transaction after inserting inputs and outputs cause
    // the insert event gets triggered after the below line.
    const existingTxns = await this.getAll({
      hash: txn.hash,
      walletId: txn.walletId,
      coin: txn.coin,
      sentReceive: txn.sentReceive
    });
    if (existingTxns.length > 0) {
      await this.update(txn, {
        hash: txn.hash,
        walletId: txn.walletId,
        slug: txn.slug,
        sentReceive: txn.sentReceive
      });
    } else {
      await super.insert(txn);
    }
  }

  public async getAllTXns(
    query: TxQueryOptions,
    sorting?: {
      sort: string;
      order?: 'asc' | 'desc';
      limit?: number;
    }
  ) {
    let andQuery = '';
    let andQueryValues = [];
    if (query.excludeFees) {
      delete query.excludeFees;
      andQuery += ' AND sentReceive = "FEES"';
    }
    if (query.excludeFailed) {
      delete query.excludeFailed;
      andQuery += ' AND status <> 2';
    }

    if (query.excludePending) {
      delete query.excludePending;
      andQuery += ' AND status <> 0';
    }

    if (query.sinceDate) {
      andQueryValues.push(query.sinceDate.getTime());
      delete query.sinceDate;
      andQuery += ' AND confirmed >= ?';
    }

    if (query.minConfirmations) {
      andQueryValues.push(query.minConfirmations);
      delete query.minConfirmations;
      andQuery += ' AND confirmations >= ?';
    }

    if (query.statusMessage) {
      const statusCode =
        query.statusMessage === 'PENDING'
          ? 0
          : query.statusMessage === 'SUCCESS'
          ? 1
          : 2;
      andQueryValues.push(statusCode);
      delete query.statusMessage;
      andQuery += ' AND status = ?';
    }
    let txns;

    if (andQuery.length > 0) {
      console.log(query, sorting, andQuery, andQueryValues);
      txns = await super.getAll(query, sorting, andQuery, andQueryValues);
    } else {
      txns = await super.getAll(query, sorting);
    }
    txns.map(async txn => {
      txn.inputs = await this.inputOutput.getAll({
        hash: txn.hash,
        type: IOtype.INPUT
      });
      txn.outputs = await this.inputOutput.getAll({
        hash: txn.hash,
        type: IOtype.OUTPUT
      });
    });
    return txns;
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
          addressFromDB.map(elem => elem.address)
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
      await this.update(
        {
          confirmations: newTxn.confirmations,
          blockHeight: newTxn.blockHeight,
          status: newTxn.status
        },
        { hash: txn.hash, walletId: walletId }
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
          addressFromDB.map(elem => elem.address)
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
        await this.update(
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

  public async delete(query?: Partial<Transaction>) {
    const txns = await super.getAll(query);
    await Promise.all(
      txns.map(txn => {
        return this.inputOutput.delete({ hash: txn.hash });
      })
    );
    await super.delete(query);
  }

  /**
   * Set all the pending txn waiting for confirmations to failure after specified time.
   */
  public async failExpiredTxn() {
    // expire txns after 24 hours
    const expireTime =
      new Date().getTime() - PENDING_TO_FAIL_TIMEOUT_IN_HOURS * 60 * 60 * 1000;
    await this.executeSql(
      'UPDATE transactions SET status = 2 WHERE status = 1 AND confirmed < ?',
      [expireTime]
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
      this.update(
        {
          status: txn.isError ? 2 : 1,
          confirmations: txn.confirmations || 0
        },
        { hash: txn.hash.toLowerCase() }
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

        this.update(updatedValues, { hash: txn.hash }).then(() =>
          this.emit('insert')
        );
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
          this.update(
            { confirmations, status: confirmations >= 1 ? 1 : 0 },
            { hash: txn.hash }
          );
          return confirmations;
        }
      }
    }

    return 0;
  }
}
