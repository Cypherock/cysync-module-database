import { TransactionFileDB } from '../src/websql/dbs/transaction';
import fs from 'fs';

describe('TransactionFileDB', () => {
    const testFilePath = 'transactions-test.json';
    const transactionDB = new TransactionFileDB(testFilePath);

    beforeEach(async () => {
        // Remove test data file if it exists
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }

        await transactionDB.initialise();
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

    it('should have the transaction key set', async () => {
        const transactions = await transactionDB.getAll();
        expect(transactions).toStrictEqual([]);
    });

    it('should insert a new transaction data', async () => {
        const sampleTransaction = {
            from: 'abc',
            to: 'xyz',
            amount: 100,
            currency: 'USD',
            date: new Date().toISOString(),
        };

        await transactionDB.insert({
            _id: '1',
            ...sampleTransaction
        });
        const transactions = await transactionDB.getAll();
        expect(transactions).toContainEqual({
            _id: '1',
            ...sampleTransaction
        });
    });

    it('should update transaction data', async () => {
        const sampleTransaction = {
            _id: '1',
            from: 'abc',
            to: 'xyz',
            amount: 100,
            currency: 'USD',
            date: new Date().toISOString(),
        }


        await transactionDB.insert(sampleTransaction);

        const updatedTransaction = {
            _id: '1',
            from: 'abcd',
            to: 'wxyz',
            amount: 200,
            currency: 'EUR',
            date: new Date().toISOString(),
        };

        await transactionDB.update('1', updatedTransaction);

        const transactions = await transactionDB.getAll();
        expect(transactions).toContainEqual(updatedTransaction);
    });
});
