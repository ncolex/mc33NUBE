/**
 * Database abstraction layer
 * Provides unified API for SQLite (local) and PostgreSQL (Vercel)
 */

import { getDatabase, isPostgresMode } from './db';
import { query, queryOne } from './db-postgres';
import { logger } from './logger';

/**
 * Unified database query interface
 * Automatically routes to SQLite or PostgreSQL based on environment
 */
export const db = {
  /**
   * Execute a query and return all results
   */
  async all<T = any>(sqliteStmt: string, params: any[] = []): Promise<T[]> {
    if (isPostgresMode()) {
      // Convert SQLite syntax to PostgreSQL
      const pgSql = convertSqliteToPostgres(sqliteStmt);
      return await query<T>(pgSql, params);
    } else {
      const db = getDatabase();
      const stmt = db.prepare(sqliteStmt);
      return stmt.all(...params) as T[];
    }
  },

  /**
   * Execute a query and return first result
   */
  async get<T = any>(sqliteStmt: string, params: any[] = []): Promise<T | null> {
    if (isPostgresMode()) {
      const pgSql = convertSqliteToPostgres(sqliteStmt);
      return await queryOne<T>(pgSql, params);
    } else {
      const db = getDatabase();
      const stmt = db.prepare(sqliteStmt);
      return stmt.get(...params) as T | null;
    }
  },

  /**
   * Execute a query (INSERT, UPDATE, DELETE)
   */
  async run(sqliteStmt: string, params: any[] = []): Promise<{ lastInsertRowid: number | string; changes: number }> {
    if (isPostgresMode()) {
      // For PostgreSQL, we need to handle RETURNING clause
      let pgSql = convertSqliteToPostgres(sqliteStmt);
      
      // Add RETURNING id if it's an INSERT
      if (sqliteStmt.trim().toUpperCase().startsWith('INSERT') && !pgSql.includes('RETURNING')) {
        pgSql = pgSql.replace(/;$/, ' RETURNING id');
      }
      
      const result = await query(pgSql, params);
      const lastInsertRowid = result[0]?.id || result[0]?.id || null;
      return { lastInsertRowid, changes: 1 };
    } else {
      const db = getDatabase();
      const stmt = db.prepare(sqliteStmt);
      const result = stmt.run(...params);
      return { 
        lastInsertRowid: result.lastInsertRowid != null ? String(result.lastInsertRowid) : 0,
        changes: result.changes 
      };
    }
  },

  /**
   * Execute a prepared statement with a function
   */
  prepare(sqliteStmt: string) {
    if (isPostgresMode()) {
      throw new Error(
        'db.prepare() is not supported in PostgreSQL mode. ' +
        'Use db.all(), db.get(), or db.run() directly with full SQL statements.'
      );
    }
    return getDatabase().prepare(sqliteStmt);
  },

  /**
   * Execute a transaction (SQLite only for now)
   */
  transaction<T>(fn: () => T): T {
    if (isPostgresMode()) {
      // PostgreSQL transactions are handled differently
      // For now, just execute the function
      logger.warn('db.transaction() called in PostgreSQL mode - running without transaction');
      return fn();
    }
    const db = getDatabase();
    const txn = db.transaction(fn);
    return txn() as T;
  },

  /**
   * Execute raw SQL (PostgreSQL only)
   */
  async exec(sql: string): Promise<void> {
    if (isPostgresMode()) {
      await query(sql);
    } else {
      const db = getDatabase();
      db.exec(sql);
    }
  },
};

/**
 * Convert SQLite syntax to PostgreSQL
 * This is a basic converter - complex queries may need manual adjustment
 */
function convertSqliteToPostgres(sql: string): string {
  let pgSql = sql;

  // Replace AUTOINCREMENT with SERIAL (for CREATE TABLE)
  pgSql = pgSql.replace(/AUTOINCREMENT/gi, 'SERIAL');

  // Replace unixepoch() with EXTRACT(EPOCH FROM NOW())
  pgSql = pgSql.replace(/unixepoch\(\)/gi, 'EXTRACT(EPOCH FROM NOW())::INTEGER');

  // Replace datetime('now') with NOW()
  pgSql = pgSql.replace(/datetime\('now'\)/gi, 'NOW()');

  // Replace ? placeholders with $1, $2, etc.
  let paramIndex = 1;
  pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

  // Replace IS NULL checks for booleans
  pgSql = pgSql.replace(/IS NULL DEFAULT (true|false)/gi, '= $1');

  // Convert JSON to JSONB
  pgSql = pgSql.replace(/\bJSON\b/g, 'JSONB');

  // Replace IF NOT EXISTS for columns (PostgreSQL doesn't support this in ALTER TABLE)
  // This is a limitation - manual migration may be needed

  return pgSql;
}

/**
 * Initialize database on module load
 */
if (typeof window === 'undefined' && !isPostgresMode()) {
  try {
    getDatabase();
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize database');
  }
}
