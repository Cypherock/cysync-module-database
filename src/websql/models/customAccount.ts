import IModel from './model';

/**
 * A model to store any other crypto assets like Tokens, NFTs, etc except the native currency of the network.
 */
export default interface CustomAccount extends IModel {
  walletId: string;
  coin: string;
  /**
   * Uniquer identifier for the token.
   */
  name: string;
  balance: string;
  price: string;
}
