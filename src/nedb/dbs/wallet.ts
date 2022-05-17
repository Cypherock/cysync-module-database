import Service from '../module/database';
import HardwareWallet from '../models/hardwareWallet';

/**
 * Class for the hardware wallets database. This db stores the hardware wallets,
 * and their ID, and if there exists a pin on them or not. This class also emits
 * "insert", "delete", and "update" events in case of these operations.
 *
 * @extends Service
 */
export default class WalletDB extends Service<HardwareWallet> {
  constructor(userDataPath = '') {
    /**
     *  Calls the super constructor with the database name.
     */
    super('wallets', userDataPath, 'v1');
    this.db.ensureIndex({ fieldName: 'name', unique: true });
    this.db.ensureIndex({ fieldName: 'walletId', unique: true });
  }

  /**
   * returns a promise that resolves to a list of all the wallets.
   */
  public getAll = (
    query?: {
      walletId?: string;
      name?: string;
      passwordSet?: boolean;
      passphraseSet?: boolean;
    },
    sorting?: {
      sort: string;
      order?: 'a' | 'd';
    }
  ) => {
    let dbQuery: any = {};

    if (query) {
      dbQuery = { ...query };
    }

    if (sorting) {
      return this.db
        .find(dbQuery)
        .sort({ [sorting.sort]: sorting.order === 'a' ? 1 : -1 })
        .exec();
    }

    return this.db.find(dbQuery).sort({ name: 1 }).exec();
  };

  /**
   * returns a promise which resolves to a single wallet.
   * @param walletId - id of the wallet which is to be retrieved.
   */
  public getByID(walletId: string) {
    return this.db.find({ walletId }).exec();
  }

  /**
   * inserts a wallet into the database.
   * @param hardwareWallet
   */
  public async insert(hardwareWallet: HardwareWallet) {
    return this.db
      .insert(this.createdDBObject(hardwareWallet))
      .then(() => this.emit('insert'));
  }

  /**
   * deletes a wallet with the corresponding wallet ID.
   * @param walletId
   */
  public async delete(walletId: string) {
    return this.db.remove({ walletId }).then(() => this.emit('delete'));
  }

  /**
   * deletes all wallets from the database.
   */
  public async deleteAll() {
    return this.db.remove({}, { multi: true }).then(() => this.emit('delete'));
  }

  /**
   * updates a wallet.
   * @param hardwareWallet - the hardware wallet object.
   */
  public async update(hardwareWallet: HardwareWallet) {
    return this.db
      .update(
        { walletId: hardwareWallet.walletId },
        { $set: { ...hardwareWallet } }
      )
      .then(() => this.emit('update'));
  }

  /**
   * returns a promise which resolves to a boolean value which states whether a hardware wallet contains a pin or not.
   * @param walletId - the ID of the wallet
   */
  public async pinExists(walletId: string) {
    this.db.findOne({ walletId }).then((wallet: HardwareWallet) => {
      return wallet.passwordSet;
    });
  }
}
