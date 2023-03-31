import * as fs from 'fs/promises';


class Logger {
  log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}


interface Database {
  [key: string]: any;
}

const logger = new Logger();

export class FileDatabaseProvider {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.readData();
  }

  async destroy(): Promise<void> {
    await fs.rm(this.filePath)
  }

  async readData(): Promise<Database> {
    try{
      const data = await fs.readFile(this.filePath, 'utf8');
      logger.log(`Read data from file: ${this.filePath}`);
      
      if(!data) return {};
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(this.filePath, '{}')
        logger.log(`Create file: ${this.filePath}`);
        return {};
      } else {
        // Other error occurred, throw it
        throw error;
      }
    }
  }

  private async writeData(data: Database): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      await fs.writeFile(this.filePath, jsonData);
      logger.log(`Wrote data to file: ${this.filePath}`);
    } catch (error) {
      logger.log(`Error writing data to file: ${this.filePath}`);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const data = await this.readData();
      logger.log(`Got data from file: ${this.filePath}`);
      return data[key];
    } catch (error) {
      logger.log(`Error getting data from file: ${this.filePath}`);
      throw error;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const data = await this.readData();
      data[key] = value;
      await this.writeData(data);
      logger.log(`Set data from file: ${this.filePath}`);
    } catch (error) {
      logger.log(`Error setting data from file: ${this.filePath}`);
      throw error;
    }
  }

  async update(key: string, value: any): Promise<void> {
    console.log('======= test', key, value)
    const data = await this.readData();
    if (key in data) {
      data[key] = value;
      console.log('========== found key', data)
      await this.writeData(data);
      logger.log(`Updated data from file: ${this.filePath}`);
    } else {
      console.log('========== not found key')
      logger.log(`Key "${key}" does not exist`);
      throw new Error(`Key "${key}" does not exist`);
    }
  }

  async delete(key: string): Promise<void> {
    const data = await this.readData();
    if (key in data) {
      delete data[key];
      await this.writeData(data);
      logger.log(`Deleted data from file: ${this.filePath}`);
    } else {
      logger.log(`Key "${key}" does not exist`);
      throw new Error(`Key "${key}" does not exist`);
    }
  }
}

export class FileDB {
  db: FileDatabaseProvider;
  dbName: string;

  constructor(dbName: string, dbFilePath: string) {
    this.db = new FileDatabaseProvider(dbFilePath);
    this.dbName = dbName;
  }

  public async initialise(): Promise<void> {
    const table = await this.db.get(this.dbName);
    if (!table) {
      await this.db.set(this.dbName, []);
    }
  }

  public async getAll(): Promise<any> {
    return await this.db.get(this.dbName);
  }

  public async insert(data: any): Promise<void> {
    const table = await this.db.get(this.dbName);
    table.push(data);
    await this.db.set(this.dbName, table);
  }

  public async update(id: string, data: any): Promise<void> {
    const table = await this.db.get(this.dbName);
    const index = table.findIndex((item: any) => item._id === id);
    if (index === -1) {
      throw new Error(`Key ${id} does not exist`);
    }
    table[index] = data;
    await this.db.set(this.dbName, table);
  }
}