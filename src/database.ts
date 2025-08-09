import * as sqlite3 from "sqlite3";
import * as fs from "fs";
import * as path from "path";

// SQLite database manager
export class SqliteDatabase {
  private db: sqlite3.Database | null = null;

  constructor(private dbPath: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            resolve();
          }
        });
      });
    }
  }

  async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    return new Promise((resolve, reject) => {
      const isWriteQuery = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(query);
      
      if (isWriteQuery) {
        this.db!.run(query, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve([{ affected_rows: this.changes, lastID: this.lastID }]);
          }
        });
      } else {
        this.db!.all(query, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      }
    });
  }
}

// Global database instances cache
const dbInstances = new Map<string, SqliteDatabase>();

export async function getDatabase(dbPath: string): Promise<SqliteDatabase> {
  if (!dbInstances.has(dbPath)) {
    const db = new SqliteDatabase(dbPath);
    await db.connect();
    dbInstances.set(dbPath, db);
  }
  return dbInstances.get(dbPath)!;
}

export async function cleanupDatabase(dbPath: string): Promise<void> {
  const db = dbInstances.get(dbPath);
  if (db) {
    await db.close();
    dbInstances.delete(dbPath);
  }
}
