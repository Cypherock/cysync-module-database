import { Db } from '../module2/database';
import {InputOutput} from '../models2/inputOutput';

export class InputOutputDb extends Db<InputOutput> {
  public counter = 0;

  constructor() {
    super('inputOutput');
    this.executeSql(`CREATE TABLE IF NOT EXISTS ${this.table} (
            hash TEXT NOT NULL,
            type TEXT NOT NULL,
            address TEXT NOT NULL,
            value TEXT NOT NULL,
            isMine BOOLEAN NOT NULL,
            indexNumber INTEGER NOT NULL,
            PRIMARY KEY (hash, indexNumber, type)
        )`);
  }

  public async insert(doc: InputOutput): Promise<void> {
    const existingIO = await this.getOne({ hash: doc.hash, indexNumber: doc.indexNumber, type: doc.type });
    if (existingIO) {
      await this.update(doc, { hash: doc.hash, indexNumber: doc.indexNumber, type: doc.type });
    } else {
      await super.insert(doc);
    }
  }
}
