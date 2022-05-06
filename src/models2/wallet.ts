export default interface IWallet {
    id: string;
    device: string;
    name: string;
    passwordSet: boolean;
    passphraseSet: boolean;
}