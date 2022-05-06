export default interface IWallet {
    id: string;
    deviceId: number;
    name: string;
    passwordSet: boolean;
    passphraseSet: boolean;
}