import { WalletFileDB } from '../src/websql/dbs/wallet';
import fs from 'fs';
import IWallet from '../src/websql/models/wallet';

describe('WalletFileDB', () => {
    const testFilePath = 'wallet-test.json';
    const walletDB = new WalletFileDB(testFilePath);

    beforeEach(async () => {
        // Remove test data file if it exists
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        await walletDB.initialise();
    });

    afterEach(() => {
        // Remove test data file if it exists
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    it('should initialize the file path', () => {
        expect(fs.existsSync(testFilePath)).toBe(true);
    });

    it('should have the wallet key set', async () => {
        const wallets = await walletDB.getAll();
        expect(wallets).toStrictEqual([]);
    });

    it('should insert a new wallet data', async () => {
        const sampleWallet: IWallet = {
            device: 'abc',
            name: 'xyz',
            passwordSet: true,
            passphraseSet: false,
        };

        await walletDB.insert({
            _id: '1',
            ...sampleWallet
        });
        const wallets = await walletDB.getAll();
        expect(wallets).toContainEqual({
            _id: '1',
            ...sampleWallet
        });
    });

    it('should update wallet data', async () => {
        const sampleWallet: IWallet = {
            device: 'abc',
            name: 'xyz',
            passwordSet: true,
            passphraseSet: false,
        }


        await walletDB.insert({
            _id: '1',
            ...sampleWallet
        });

        const updatedWallet: IWallet = {
            device: 'abcd',
            name: 'wxyz',
            passwordSet: true,
            passphraseSet: true,
        };

        await walletDB.update('1', {
            _id: '1',
            ...updatedWallet
        });

        const wallets = await walletDB.getAll();
        expect(wallets).toContainEqual({
            _id: '1',
            ...updatedWallet
        });
    });
});
