import { AccountFileDB } from '../src/websql/dbs/account';
import fs from 'fs';

describe('AccountFileDB', () => {
    const testFilePath = 'account-test.json';
    const accountDB = new AccountFileDB(testFilePath);

    beforeEach(async () => {
        // Remove test data file if it exists
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        await accountDB.initialise();
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

    it('should have the account key set', async () => {
        const accounts = await accountDB.getAll();
        expect(accounts).toStrictEqual([]);
    });

    it('should insert a new account data', async () => {
        const sampleAccount = {
            walletId: '1',
            name: 'abc',
            address: 'def',
        };

        await accountDB.insert({
            _id: '1',
            ...sampleAccount
        });
        const accounts = await accountDB.getAll();
        expect(accounts).toContainEqual({
            _id: '1',
            ...sampleAccount
        });
    });

    it('should update account data', async () => {
        const sampleAccount = {
            walletId: '1',
            name: 'abc',
            address: 'def',
        }


        await accountDB.insert({
            _id: '1',
            ...sampleAccount
        });

        const updatedAccount = {
            walletId: '1',
            name: 'xyz',
            address: 'uvw',
        };

        await accountDB.update('1', {
            _id: '1',
            ...updatedAccount
        });

        const accounts = await accountDB.getAll();
        expect(accounts).toContainEqual({
            _id: '1',
            ...updatedAccount
        });
    });

    it('should get accounts by wallet id', async () => {
        const sampleAccounts = [
            {
                walletId: '1',
                name: 'abc',
                address: 'def',
            },
            {
                walletId: '2',
                name: 'xyz',
                address: 'uvw',
            },
            {
                walletId: '1',
                name: 'pqr',
                address: 'mno',
            },
        ];

        for (const [index, account] of sampleAccounts.entries()) {
            await accountDB.insert({
                _id: `${index}`,
                ...account
            });
        }

        const accountsByWalletId = await accountDB.getAccountsByWalletId('1');
        expect(accountsByWalletId).toHaveLength(2);
        expect(accountsByWalletId[0].walletId).toBe('1');
        expect(accountsByWalletId[1].walletId).toBe('1');
    });
});
