/**
 * Vercel deployment initialization
 * Runs database migrations on PostgreSQL before the app starts
 */

import { runPostgresMigrations } from './migrations-postgres';
import { isPostgresMode } from './db';
import { logger } from './logger';

/**
 * Initialize database for Vercel deployment
 * Call this in API routes or middleware when using PostgreSQL
 */
export async function initDatabase() {
  if (!isPostgresMode()) {
    logger.info('Not in PostgreSQL mode, skipping init');
    return;
  }

  try {
    logger.info('Running PostgreSQL migrations for Vercel deployment');
    await runPostgresMigrations();
    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Database initialization failed');
    throw error;
  }
}
