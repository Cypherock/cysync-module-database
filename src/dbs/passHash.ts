var aesjs = require('aes-js');
var macaddress = require('macaddress');


export enum PassEncryptErrType {
  DECRYPTION_FAIL,
  OBJ_UNDEF
}

const defaultErrorMessages = {
  [PassEncryptErrType.DECRYPTION_FAIL]: 'decryption failure',
  [PassEncryptErrType.OBJ_UNDEF]: 'pass-encrypt obj not present'
};

export class PassEncryptError extends Error {
  public errorType: PassEncryptErrType;
  constructor(errorType: PassEncryptErrType, msg?: string) {
    let message = msg;

    if (!msg && defaultErrorMessages[errorType]) {
      message = defaultErrorMessages[errorType];
    }

    super(message);
    this.errorType = errorType;

    Object.setPrototypeOf(this, PassEncryptError.prototype);
  }
}


export default class PassEncrypt{
  private passHash = [];
  private mac:string = '';
  private aesCtr:any;
  
  public setPassHash(passhash:string){
    if(passhash == null){
      this.aesCtr = undefined;
      this.passHash.splice(0, this.passHash.length);
      return;
    }

    this.passHash = aesjs.utils.utf8.toBytes(passhash.substring(passhash.length-16));
    this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
  }

  public async encryptData(data:string){
    if(this.mac === ''){
      this.mac = await macaddress.one();
    }
    if(!this.aesCtr){
      return data;
    }

    data = data+this.mac;
    return aesjs.utils.hex.fromBytes(this.aesCtr.encrypt(aesjs.utils.utf8.toBytes(data)));
  }

  public extractDataAndVerifyMac(decryptedData:string):[boolean,string]{
    return [this.mac === decryptedData.substring(decryptedData.length-17), decryptedData.substring(0,decryptedData.length-17)];
  }

  public async decryptData(encrypted:string){
    if(this.mac === ''){
      this.mac = await macaddress.one();
    }      
    if(!this.aesCtr){
      return encrypted;
    }

    let data = aesjs.utils.utf8.fromBytes(this.aesCtr.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    let [verified, extract] = this.extractDataAndVerifyMac(data);
    if(!verified){
      throw new PassEncryptError(PassEncryptErrType.DECRYPTION_FAIL);
    }
    else{
      return extract;
    }
  }

  public DestroyHash(){
    this.passHash.splice(0, this.passHash.length);
    this.aesCtr = undefined;
  }
}
