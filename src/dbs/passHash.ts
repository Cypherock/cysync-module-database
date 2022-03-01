import aesjs from 'aes-js';
import { PassEncryptError, PassEncryptErrType } from '.';
import crypto from 'crypto';
export default class PassEncrypt{
  private passHash:Uint8Array = new Uint8Array();
  private analyticsIdHash:string = '';
  private aesCtr:aesjs.ModeOfOperation.ModeOfOperationCTR = new aesjs.ModeOfOperation.ctr(this.passHash);
  private passSet:boolean = false;

  constructor(analyticsIdIn:string){
    if(analyticsIdIn === undefined){
      throw new PassEncryptError(PassEncryptErrType.ANALYTICS_ID_UNDEF);
    }
    this.analyticsIdHash = crypto
    .createHmac('sha256', analyticsIdIn).digest('hex');
  }

  public setPassHash(passhash:string){
    if(passhash == null){
      this.passHash = new Uint8Array();
      this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
      return;
    }
    this.passSet = true;
    this.passHash = aesjs.utils.utf8.toBytes(passhash.substring(passhash.length-16));
    this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
  }

  public encryptData(data:string){
    if(!this.passSet){
      return data;
    }

    data = data+this.analyticsIdHash;
    return aesjs.utils.hex.fromBytes(this.aesCtr.encrypt(aesjs.utils.utf8.toBytes(data)));
  }

  public extractDataAndVerifyanalyticsId(decryptedData:string):[boolean,string]{
    return [this.analyticsIdHash === decryptedData.substring(decryptedData.length - 64), decryptedData.substring(0,decryptedData.length - 64)];
  }

  public decryptData(encrypted:string){

    if(!this.passSet){
      return encrypted;
    }

    const data = aesjs.utils.utf8.fromBytes(this.aesCtr.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    const [verified, extract] = this.extractDataAndVerifyanalyticsId(data);
    if(!verified){
      throw new PassEncryptError(PassEncryptErrType.DECRYPTION_FAIL);
    }
    else{
      return extract;
    }
  }

  public DestroyHash(){
    this.passHash = new Uint8Array();
    this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
    this.passSet = false;
  }
}
