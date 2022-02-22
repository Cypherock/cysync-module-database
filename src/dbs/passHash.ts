var aesjs = require('aes-js');
var macaddress = require('macaddress');

export default class PassEncrypt{
  private passHash = [];
  private mac:string = '';
  private aesCtr:any;

  public async init(){
    this.mac = await macaddress.one();
  }
  
  public setPassHash(passhash:string){
    if(passhash == null){
      this.aesCtr = undefined;
      this.passHash.slice(0, this.passHash.length);
      return;
    }

    this.passHash = aesjs.utils.utf8.toBytes(passhash.substring(passhash.length-16));
    this.aesCtr = new aesjs.ModeOfOperation.ctr(this.passHash);
  }

  public encryptData(data:string){
    if(!this.aesCtr){
      return data;
    }
    
    data = data+this.mac;
    return aesjs.utils.hex.fromBytes(this.aesCtr.encrypt(aesjs.utils.utf8.toBytes(data)));
  }

  public extractDataAndVerifyMac(decryptedData:string):[boolean,string]{
    return [this.mac === decryptedData.substring(decryptedData.length-17), decryptedData.substring(0,decryptedData.length-17)];
  }

  public decryptData(encrypted:string){
    if(!this.aesCtr){
      return encrypted;
    }

    let data = aesjs.utils.utf8.fromBytes(this.aesCtr.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    let [verified, extract] = this.extractDataAndVerifyMac(data);
    if(!verified){
      throw "decryption failure";
    }
    else{
      return extract;
    }
  }
  public DestroyHash(){
    this.passHash.splice(0, this.passHash.length);
  }
}
