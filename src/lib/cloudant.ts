/**
 * IBM Cloudant Database Connection Module
 * 
 * Provides a caching layer using IBM Cloudant NoSQL database with TTL support.
 * Handles connection initialization, error handling, and CRUD operations.
 */

import { CloudantV1 } from '@ibm-cloud/cloudant';
import { IamAuthenticator } from 'ibm-cloud-sdk-core';
import { CachedData } from '@/types/database';

/**
 * CloudantCache class for managing cached research data
 * 
 * Features:
 * - Automatic TTL (Time To Live) management
 * - Connection pooling and error handling
 * - Type-safe operations with TypeScript
 * - Automatic database creation if not exists
 */
export class CloudantCache {
  private client: CloudantV1;
  private dbName: string;
  private isInitialized: boolean = false;

  /**
   * Initialize Cloudant client from environment variables
   * 
   * Required environment variables:
   * - CLOUDANT_URL: IBM Cloudant instance URL
   * - CLOUDANT_API_KEY: API key for authentication
   * - CLOUDANT_DATABASE: Database name (default: crch-cache)
   * 
   * @throws {Error} If required environment variables are missing
   */
  constructor() {
    const url = process.env.CLOUDANT_URL;
    const apiKey = process.env.CLOUDANT_API_KEY;
    this.dbName = process.env.CLOUDANT_DATABASE || 'crch-cache';

    if (!url || !apiKey) {
      throw new Error(
        'Missing required Cloudant configuration. Please set CLOUDANT_URL and CLOUDANT_API_KEY environment variables.'
      );
    }

    try {
      // Initialize Cloudant client with IAM authentication
      this.client = CloudantV1.newInstance({
        authenticator: new IamAuthenticator({
          apikey: apiKey,
        }),
      });

      this.client.setServiceUrl(url);
    } catch (error) {
      throw new Error(
        `Failed to initialize Cloudant client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Initialize the database connection and create database if needed
   * 
   * @throws {Error} If database creation or initialization fails
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if database exists
      await this.client.getDatabaseInformation({ db: this.dbName });
      this.isInitialized = true;
    } catch (error: any) {
      // Database doesn't exist, create it
      if (error.status === 404) {
        try {
          await this.client.putDatabase({ db: this.dbName });
          console.log(`Created Cloudant database: ${this.dbName}`);
          this.isInitialized = true;
        } catch (createError) {
          throw new Error(
            `Failed to create database ${this.dbName}: ${createError instanceof Error ? createError.message : 'Unknown error'}`
          );
        }
      } else {
        throw new Error(
          `Failed to connect to database ${this.dbName}: ${error.message || 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Get a cached value by key
   * 
   * @param key - Cache key to retrieve
   * @returns The cached value if found and not expired, null otherwise
   * @throws {Error} If database operation fails
   */
  async get<T = any>(key: string): Promise<T | null> {
    await this.initialize();

    try {
      const response = await this.client.getDocument({
        db: this.dbName,
        docId: key,
      });

      const cachedData = response.result as unknown as CachedData<T>;

      // Check if data has expired
      const now = Date.now();
      if (cachedData.expiresAt && cachedData.expiresAt < now) {
        // Data expired, delete it
        await this.delete(key);
        return null;
      }

      return cachedData.value;
    } catch (error: any) {
      // Document not found
      if (error.status === 404) {
        return null;
      }
      
      // Log other errors but don't throw to prevent cache failures from breaking the app
      console.error(`Error getting cached data for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set a cached value with TTL
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (default: 86400 = 24 hours)
   * @throws {Error} If database operation fails
   */
  async set<T = any>(key: string, value: T, ttl: number = 86400): Promise<void> {
    await this.initialize();

    const now = Date.now();
    const cachedData: CachedData<T> = {
      key,
      value,
      cachedAt: now,
      ttl,
      expiresAt: now + (ttl * 1000), // Convert seconds to milliseconds
    };

    try {
      // Try to get existing document to get its revision
      let rev: string | undefined;
      try {
        const existing = await this.client.getDocument({
          db: this.dbName,
          docId: key,
        });
        rev = existing.result._rev;
      } catch (error: any) {
        // Document doesn't exist, that's fine
        if (error.status !== 404) {
          throw error;
        }
      }

      // Put document with revision if it exists
      await this.client.putDocument({
        db: this.dbName,
        docId: key,
        document: {
          ...cachedData,
          _rev: rev,
        } as any,
      });
    } catch (error) {
      throw new Error(
        `Failed to cache data for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a cached value
   * 
   * @param key - Cache key to delete
   * @throws {Error} If database operation fails
   */
  async delete(key: string): Promise<void> {
    await this.initialize();

    try {
      // Get document to get its revision
      const response = await this.client.getDocument({
        db: this.dbName,
        docId: key,
      });

      const rev = response.result._rev;

      // Delete document
      await this.client.deleteDocument({
        db: this.dbName,
        docId: key,
        rev: rev!,
      });
    } catch (error: any) {
      // Document not found is not an error for delete
      if (error.status === 404) {
        return;
      }
      
      throw new Error(
        `Failed to delete cached data for key ${key}: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a key exists in the cache and is not expired
   * 
   * @param key - Cache key to check
   * @returns true if key exists and is not expired, false otherwise
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Clear all expired entries from the cache
   * 
   * @returns Number of entries deleted
   */
  async clearExpired(): Promise<number> {
    await this.initialize();

    try {
      // Get all documents
      const response = await this.client.postAllDocs({
        db: this.dbName,
        includeDocs: true,
      });

      const now = Date.now();
      let deletedCount = 0;

      // Find and delete expired documents
      for (const row of response.result.rows) {
        if (row.doc) {
          const cachedData = row.doc as unknown as CachedData;
          if (cachedData.expiresAt && cachedData.expiresAt < now) {
            await this.delete(cachedData.key);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error clearing expired cache entries:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * 
   * @returns Object containing cache statistics
   */
  async getStats(): Promise<{
    totalItems: number;
    expiredItems: number;
    activeItems: number;
  }> {
    await this.initialize();

    try {
      const response = await this.client.postAllDocs({
        db: this.dbName,
        includeDocs: true,
      });

      const now = Date.now();
      let expiredCount = 0;
      let activeCount = 0;

      for (const row of response.result.rows) {
        if (row.doc) {
          const cachedData = row.doc as unknown as CachedData;
          if (cachedData.expiresAt) {
            if (cachedData.expiresAt < now) {
              expiredCount++;
            } else {
              activeCount++;
            }
          }
        }
      }

      return {
        totalItems: response.result.rows.length,
        expiredItems: expiredCount,
        activeItems: activeCount,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalItems: 0,
        expiredItems: 0,
        activeItems: 0,
      };
    }
  }
}

// Export singleton instance
let cacheInstance: CloudantCache | null = null;
let cacheInitFailed = false;

/**
 * No-op cache fallback when Cloudant is not configured
 */
const noopCache = {
  async get() { return null; },
  async set() {},
  async delete() {},
  async has() { return false; },
  async clearExpired() { return 0; },
  async getStats() { return { totalItems: 0, expiredItems: 0, activeItems: 0 }; },
} as unknown as CloudantCache;

/**
 * Get the singleton CloudantCache instance
 * Returns a no-op cache if Cloudant is not configured
 * 
 * @returns CloudantCache instance
 */
export function getCloudantCache(): CloudantCache {
  if (cacheInitFailed) {
    return noopCache;
  }
  if (!cacheInstance) {
    try {
      cacheInstance = new CloudantCache();
    } catch (error) {
      console.warn('Cloudant cache not available, using no-op cache:', 
        error instanceof Error ? error.message : error);
      cacheInitFailed = true;
      return noopCache;
    }
  }
  return cacheInstance;
}

// Made with Bob
