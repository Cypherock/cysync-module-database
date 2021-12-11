import IModel from './model';

export default interface IErc20Token extends IModel {
  walletId: string;
  coin: string;
  // This differentiates between ETH tokens and ETHR tokens
  ethCoin: string;
  balance: string;
}
