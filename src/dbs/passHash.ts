import aesjs from 'aes-js';
import { DatabaseError, DatabaseErrType } from '.';
import crypto from 'crypto';
export default class PassEncrypt {
  private passHash: Uint8Array = new Uint8Array(16);
  private IdHash: string = '';
  private aesCtr: aesjs.ModeOfOperation.ModeOfOperationCTR =
    new aesjs.ModeOfOperation.ctr(this.passHash);
  private passSet: boolean = false;

  constructor(IdIn: string) {
    if (IdIn === undefined) {
      throw new DatabaseError(DatabaseErrType.ID_UNDEF);
    }
    this.IdHash = crypto.createHmac('sha256', IdIn).digest('hex');
  }

  public setPassHash(passhash: string) {
    if (passhash == null) {
      this.passHash = new Uint8Array(16);
      this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
      this.passSet = false;
      return;
    }
    this.passSet = true;
    this.passHash = aesjs.utils.utf8.toBytes(
      passhash.substring(passhash.length - 16)
    );
    this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
  }

  public encryptData(data: string) {
    if (!this.passSet || this.passHash.length === 0) {
      return data;
    }

    const tempdata = data + this.IdHash;
    return aesjs.utils.hex.fromBytes(
      this.aesCtr.encrypt(aesjs.utils.utf8.toBytes(tempdata))
    );
  }

  public extractDataAndVerifyId(decryptedData: string): [boolean, string] {
    return [
      this.IdHash === decryptedData.substring(decryptedData.length - 64),
      decryptedData.substring(0, decryptedData.length - 64)
    ];
  }

  public decryptData(encrypted: string) {
    if (!this.passSet) {
      return encrypted;
    }

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

  public DestroyHash() {
    this.passHash = new Uint8Array(16);
    this.passSet = false;
    this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
  }
}
