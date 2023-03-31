import { FileDB } from '../src/websql/module/fileDatabase';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('FileDB', () => {
  const dbName = 'test-db';
  const filePath = `./${dbName}.json`;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialise', () => {
    it('should initialise the database if it does not exist', async () => {
      const db = new FileDB(dbName, filePath);
      // Mock the behaviour of `get` to return undefined
      // to simulate a new database
      db.db.get = jest.fn().mockResolvedValue(undefined);
      const setSpy = jest.spyOn(db.db, 'set');

      await db.initialise();

      expect(setSpy).toHaveBeenCalledWith(dbName, []);
    });

    it('should not modify the database if it already exists', async () => {
      const db = new FileDB(dbName, filePath);

      // Mock the behaviour of `get` to return an empty array
      // to simulate an existing database
      db.db.get = jest.fn().mockResolvedValue([]);
      const setSpy = jest.spyOn(db.db, 'set');

      await db.initialise();

      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all data in the database', async () => {
      const db = new FileDB(dbName, filePath);

      const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      db.db.get = jest.fn().mockResolvedValue(data);

      const result = await db.getAll();

      expect(result).toEqual(data);
    });
  });

  describe('insert', () => {
    it('should add the data to the database', async () => {
      const db = new FileDB(dbName, filePath);

      const data = { id: 1, name: 'Alice' };
      db.db.get = jest.fn().mockResolvedValue([]);
      const setSpy = jest.spyOn(db.db, 'set');
      await db.insert(data);

      expect(setSpy).toHaveBeenCalledWith(dbName, [data]);
    });
  });

  describe('update', () => {
    it('should throw an error if the record does not exist', async () => {
      const db = new FileDB(dbName, filePath);

      const initialData = [
        { _id: '1', name: 'Alice' },
        { _id: '2', name: 'Bob' },
      ];
      db.db.get = jest.fn().mockResolvedValue(initialData);

      await expect(
        db.update('3', { _id: '3', name: 'Charlie' })
      ).rejects.toThrow('Key 3 does not exist');
    });


    it('should update the data in the database', async () => {
      const db = new FileDB(dbName, filePath);

      const initialData = [
        { _id: '1', name: 'Alice' },
        { _id: '2', name: 'Bob' },
      ];
      const updatedData = { _id: '1', name: 'Alice Smith' };
      db.db.get = jest.fn().mockResolvedValue(initialData);
      const setSpy = jest.spyOn(db.db, 'set');

      await db.update('1', updatedData);

      expect(setSpy).toHaveBeenCalledWith(dbName, [
        updatedData,
        initialData[1],
      ]);
    });
  });
});
