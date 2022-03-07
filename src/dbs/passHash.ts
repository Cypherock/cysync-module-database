import aesjs from 'aes-js';
import { DatabaseError, DatabaseErrType } from '../errors';
import crypto from 'crypto';
export default class PassEncrypt {
  private passHash: Uint8Array = new Uint8Array(32);
  private idHash: string = '';
  private aesCtr: aesjs.ModeOfOperation.ModeOfOperationCTR =
    new aesjs.ModeOfOperation.ctr(this.passHash);
  private passSet: boolean = false;

  constructor(IdIn: string) {
    if (IdIn === undefined) {
      throw new DatabaseError(DatabaseErrType.ID_UNDEF);
    }
    this.idHash = crypto.createHmac('sha256', IdIn).digest('hex');
  }

  public setPassHash(passhash: string) {
    if (passhash == null || passhash.length !== 64) {
      this.passHash = new Uint8Array(32);
      this.passSet = false;
      return;
    }
    this.passSet = true;
    this.passHash = aesjs.utils.utf8.toBytes(passhash.substring(32)); //sha2
  }

  public encryptData(data: string) {
    if (!this.passSet || this.passHash.length === 0) {
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
      throw new DatabaseError(DatabaseErrType.UNEXPECTED_DATA_LEN);
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
      throw new DatabaseError(DatabaseErrType.DECRYPTION_FAIL);
    } else {
      return extract;
    }
  }

  public destroyHash() {
    this.passHash = new Uint8Array(32);
    this.passSet = false;
  }
}
