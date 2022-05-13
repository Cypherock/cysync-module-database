import aesjs from 'aes-js';
import { DatabaseError, DatabaseErrorType } from '../errors';
import crypto from 'crypto';
export default class PassEncrypt {
  private passHash: Uint8Array = new Uint8Array(32);
  private idHash: string = '';
  private aesCtr: aesjs.ModeOfOperation.ModeOfOperationCTR =
    new aesjs.ModeOfOperation.ctr(this.passHash);
  public passSet: boolean = false;

  constructor(idIn: string) {
    if (idIn === undefined) {
      throw new DatabaseError(DatabaseErrorType.UNIQUE_ID_UNDEFINED);
    }
    this.idHash = crypto.createHmac('sha256', idIn).digest('hex');
  }

  public setPassHash(passhash: string) {
    if (passhash == null || !passhash) {
      this.passHash = new Uint8Array(32);
      this.passSet = false;
      return;
    }

    if (passhash.length !== 64) {
      throw new Error('Invalid password provided in PassEncrypt');
    }

    this.passSet = true;
    this.passHash = aesjs.utils.utf8.toBytes(passhash.substring(32)); //sha2
  }

  public encryptData(data: string) {
    if (!this.passSet) {
      return data;
    }

    this.aesCtr = new aesjs.ModeOfOperation.ctr(
      this.passHash,
      new aesjs.Counter(5)
    );
    const tempdata = data + this.idHash;
    return aesjs.utils.hex.fromBytes(
      this.aesCtr.encrypt(aesjs.utils.utf8.toBytes(tempdata))
    );
  }

  public extractDataAndVerifyId(decryptedData: string): [boolean, string] {
    if (decryptedData.length <= 64) {
      throw new DatabaseError(DatabaseErrorType.UNEXPECTED_DATA_LEN);
    }
    return [
      this.idHash === decryptedData.substring(decryptedData.length - 64),
      decryptedData.substring(0, decryptedData.length - 64)
    ];
  }

  public decryptData(encrypted: string) {
    if (!this.passSet) {
      return encrypted;
    }

    this.aesCtr = new aesjs.ModeOfOperation.ctr(
      this.passHash,
      new aesjs.Counter(5)
    );
    const data = aesjs.utils.utf8.fromBytes(
      this.aesCtr.decrypt(aesjs.utils.hex.toBytes(encrypted))
    );
    const [verified, extract] = this.extractDataAndVerifyId(data);
    if (!verified) {
      throw new DatabaseError(DatabaseErrorType.DECRYPTION_FAIL);
    } else {
      return extract;
    }
  }

  public destroyHash() {
    this.passHash = new Uint8Array(32);
    this.passSet = false;
  }
}
