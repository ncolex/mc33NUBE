/**
 * PostgreSQL database connection for Vercel deployment
 * Uses Neon serverless driver for optimal serverless performance
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { logger } from './logger';

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

// Database connection - lazy initialized
let sql: ReturnType<typeof neon> | null = null;

/**
 * Get or create database connection
 * Uses DATABASE_URL from environment variables
 */
export function getPostgresClient() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set. ' +
        'Please configure Vercel Postgres integration or set DATABASE_URL environment variable.'
      );
    }

    sql = neon(databaseUrl);
    logger.info({ 
      url: databaseUrl.replace(/:\/\/.*@/, '://***@'), 
      mode: 'serverless' 
    }, 'PostgreSQL connection initialized');
  }

  return sql;
}

/**
 * Execute a query with parameters
 */
export async function query<T = any>(
  queryString: string,
  params: any[] = []
): Promise<T[]> {
  const client = getPostgresClient();
  
  try {
    // Neon client accepts template strings or direct query with params
    const result = await client(queryString as any, params);
    return result as T[];
  } catch (error) {
    logger.error({ err: error, query: queryString }, 'PostgreSQL query failed');
    throw error;
  }
}

/**
 * Execute a single row query
 */
export async function queryOne<T = any>(
  queryString: string,
  params: any[] = []
): Promise<T | null> {
  const results = await query<T>(queryString, params);
  return results[0] || null;
}

/**
 * Check if database is connected
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get database connection status
 */
export function getConnectionStatus(): 'connected' | 'disconnected' | 'initializing' {
  if (!sql) return 'initializing';
  return 'connected';
}
