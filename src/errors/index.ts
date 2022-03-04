export enum DatabaseErrType {
  DECRYPTION_FAIL,
  PASS_ENC_UNDEFINED,
  ID_UNDEF
}

const defaultErrorMessages = {
  [DatabaseErrType.DECRYPTION_FAIL]: 'decryption failure',
  [DatabaseErrType.PASS_ENC_UNDEFINED]: 'pass-encrypt obj not present',
  [DatabaseErrType.ID_UNDEF]: 'id not defined. unexpected err.'
};

export class DatabaseError extends Error {
  public errorType: DatabaseErrType;
  constructor(errorType: DatabaseErrType, msg?: string) {
    let message = msg;

    if (!msg && defaultErrorMessages[errorType]) {
      message = defaultErrorMessages[errorType];
    }

    super(message);
    this.errorType = errorType;

    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
