export enum DatabaseErrorType {
  DECRYPTION_FAIL,
  PASS_ENC_UNDEFINED,
  UNIQUE_ID_UNDEFINED,
  UNEXPECTED_DATA_LEN
}

const defaultErrorMessages = {
  [DatabaseErrorType.DECRYPTION_FAIL]: 'decryption failure',
  [DatabaseErrorType.PASS_ENC_UNDEFINED]: 'pass-encrypt obj not present',
  [DatabaseErrorType.UNIQUE_ID_UNDEFINED]:
    'unique id not defined. unexpected err.',
  [DatabaseErrorType.UNEXPECTED_DATA_LEN]: 'data len unexpected'
};

export class DatabaseError extends Error {
  public errorType: DatabaseErrorType;
  constructor(errorType: DatabaseErrorType, msg?: string) {
    let message = msg;

    if (!msg && defaultErrorMessages[errorType]) {
      message = defaultErrorMessages[errorType];
    }

    super(message);
    this.errorType = errorType;

    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
