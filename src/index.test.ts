import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SqliteDatabase, getDatabase, cleanupDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SqliteDatabase', () => {
  const testDbPath = path.join(__dirname, '..', 'test-db.sqlite');
  let db: SqliteDatabase;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new SqliteDatabase(testDbPath);
    await db.connect();
  });

  afterEach(async () => {
    // Clean up test database after each test
    await db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create and connect to a database', async () => {
    expect(fs.existsSync(testDbPath)).toBe(true);
  });

  it('should create a table', async () => {
    const createTableQuery = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `;
    
    const result = await db.executeQuery(createTableQuery);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('affected_rows');
  });

  it('should insert data into a table', async () => {
    // First create a table
    await db.executeQuery(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `);

    // Then insert data
    const insertQuery = `INSERT INTO users (name, email) VALUES (?, ?)`;
    const result = await db.executeQuery(insertQuery, ['John Doe', 'john@example.com']);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('affected_rows', 1);
    expect(result[0]).toHaveProperty('lastID');
  });

  it('should select data from a table', async () => {
    // Create table and insert data
    await db.executeQuery(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `);
    await db.executeQuery(`INSERT INTO users (name, email) VALUES (?, ?)`, ['John Doe', 'john@example.com']);
    await db.executeQuery(`INSERT INTO users (name, email) VALUES (?, ?)`, ['Jane Smith', 'jane@example.com']);

    // Select data
    const selectQuery = `SELECT * FROM users ORDER BY id`;
    const result = await db.executeQuery(selectQuery);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('name', 'John Doe');
    expect(result[0]).toHaveProperty('email', 'john@example.com');
    expect(result[1]).toHaveProperty('name', 'Jane Smith');
    expect(result[1]).toHaveProperty('email', 'jane@example.com');
  });

  it('should update data in a table', async () => {
    // Create table and insert data
    await db.executeQuery(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `);
    await db.executeQuery(`INSERT INTO users (name, email) VALUES (?, ?)`, ['John Doe', 'john@example.com']);

    // Update data
    const updateQuery = `UPDATE users SET name = ? WHERE email = ?`;
    const result = await db.executeQuery(updateQuery, ['John Smith', 'john@example.com']);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('affected_rows', 1);

    // Verify update
    const selectResult = await db.executeQuery(`SELECT name FROM users WHERE email = ?`, ['john@example.com']);
    expect(selectResult[0]).toHaveProperty('name', 'John Smith');
  });

  it('should delete data from a table', async () => {
    // Create table and insert data
    await db.executeQuery(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `);
    await db.executeQuery(`INSERT INTO users (name, email) VALUES (?, ?)`, ['John Doe', 'john@example.com']);
    await db.executeQuery(`INSERT INTO users (name, email) VALUES (?, ?)`, ['Jane Smith', 'jane@example.com']);

    // Delete data
    const deleteQuery = `DELETE FROM users WHERE email = ?`;
    const result = await db.executeQuery(deleteQuery, ['john@example.com']);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('affected_rows', 1);

    // Verify deletion
    const selectResult = await db.executeQuery(`SELECT * FROM users`);
    expect(selectResult).toHaveLength(1);
    expect(selectResult[0]).toHaveProperty('name', 'Jane Smith');
  });

  it('should handle errors for invalid queries', async () => {
    await expect(db.executeQuery('INVALID SQL')).rejects.toThrow();
  });

  it('should throw error when querying without connection', async () => {
    const disconnectedDb = new SqliteDatabase(testDbPath);
    await expect(disconnectedDb.executeQuery('SELECT 1')).rejects.toThrow('Database not connected');
  });

  it('should get complete schema information', async () => {
    // Create multiple tables with different schemas
    await db.executeQuery(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.executeQuery(`
      CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY,
        user_id INTEGER,
        amount DECIMAL(10,2),
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Get schema using the same logic as the get_schema tool
    const tables = await db.executeQuery("SELECT name FROM sqlite_master WHERE type='table'");
    
    const schema: any = {};
    for (const table of tables) {
      const tableInfo = await db.executeQuery(`PRAGMA table_info(${table.name})`);
      schema[table.name] = tableInfo;
    }

    // Verify schema structure
    expect(schema).toHaveProperty('users');
    expect(schema).toHaveProperty('orders');
    
    // Check users table schema
    const usersSchema = schema.users;
    expect(usersSchema).toHaveLength(4); // 4 columns
    expect(usersSchema.some((col: any) => col.name === 'id' && col.pk === 1)).toBe(true);
    expect(usersSchema.some((col: any) => col.name === 'name' && col.notnull === 1)).toBe(true);
    expect(usersSchema.some((col: any) => col.name === 'email')).toBe(true);
    expect(usersSchema.some((col: any) => col.name === 'created_at')).toBe(true);
    
    // Check orders table schema
    const ordersSchema = schema.orders;
    expect(ordersSchema).toHaveLength(4); // 4 columns
    expect(ordersSchema.some((col: any) => col.name === 'order_id' && col.pk === 1)).toBe(true);
    expect(ordersSchema.some((col: any) => col.name === 'user_id')).toBe(true);
    expect(ordersSchema.some((col: any) => col.name === 'amount')).toBe(true);
    expect(ordersSchema.some((col: any) => col.name === 'status')).toBe(true);
  });
});

describe('Database Manager Functions', () => {
  const testDbPath1 = path.join(__dirname, '..', 'test-db-1.sqlite');
  const testDbPath2 = path.join(__dirname, '..', 'test-db-2.sqlite');

  afterEach(async () => {
    // Clean up test databases
    await cleanupDatabase(testDbPath1);
    await cleanupDatabase(testDbPath2);
    
    [testDbPath1, testDbPath2].forEach(dbPath => {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    });
  });

  it('should manage multiple database instances', async () => {
    const db1 = await getDatabase(testDbPath1);
    const db2 = await getDatabase(testDbPath2);

    // Both databases should be different instances
    expect(db1).not.toBe(db2);

    // But getting the same path should return the same instance
    const db1Again = await getDatabase(testDbPath1);
    expect(db1).toBe(db1Again);
  });

  it('should create tables in different databases independently', async () => {
    const db1 = await getDatabase(testDbPath1);
    const db2 = await getDatabase(testDbPath2);

    // Create different tables in each database
    await db1.executeQuery(`CREATE TABLE users (id INTEGER, name TEXT)`);
    await db2.executeQuery(`CREATE TABLE products (id INTEGER, title TEXT)`);

    // Verify tables exist in correct databases
    const db1Tables = await db1.executeQuery(`SELECT name FROM sqlite_master WHERE type='table'`);
    const db2Tables = await db2.executeQuery(`SELECT name FROM sqlite_master WHERE type='table'`);

    expect(db1Tables.some(t => t.name === 'users')).toBe(true);
    expect(db1Tables.some(t => t.name === 'products')).toBe(false);
    
    expect(db2Tables.some(t => t.name === 'products')).toBe(true);
    expect(db2Tables.some(t => t.name === 'users')).toBe(false);
  });
});
