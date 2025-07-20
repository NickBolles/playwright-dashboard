import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection';
import { logger } from '../utils/logger';
import { loadConfig } from '../config';

interface Migration {
  id: string;
  name: string;
  sql: string;
  applied_at?: Date;
}

export class MigrationManager {
  private db = getDatabase();

  constructor() {
    // Initialize database connection with config
    const config = loadConfig();
    this.db = getDatabase(config.database);
  }

  private async ensureMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        sql TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await this.db.query(createTableSQL);
    logger.info('Migrations table ensured');
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.db.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY applied_at'
    );
    return result.rows.map(row => row.name);
  }

  private getMigrationFiles(): Migration[] {
    const migrationsDir = path.join(__dirname, 'migrations');

    // If migrations directory doesn't exist, create it and return empty array
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      return [];
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(file => {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const name = path.basename(file, '.sql');

      return {
        id: name,
        name,
        sql,
      };
    });
  }

  public async runMigrations(): Promise<void> {
    try {
      await this.ensureMigrationsTable();

      const appliedMigrations = await this.getAppliedMigrations();
      const migrationFiles = this.getMigrationFiles();

      // If no migration files exist, run the initial schema
      if (migrationFiles.length === 0) {
        await this.runInitialSchema();
        return;
      }

      const pendingMigrations = migrationFiles.filter(
        migration => !appliedMigrations.includes(migration.name)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Running ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }

  private async runInitialSchema(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
      logger.warn('No schema.sql file found, skipping initial schema setup');
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await this.db.transaction(async client => {
      // Split SQL by semicolons and execute each statement
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await client.query(statement);
      }

      // Record this as the initial migration
      await client.query('INSERT INTO migrations (name, sql) VALUES ($1, $2)', [
        '001_initial_schema',
        schemaSql,
      ]);
    });

    logger.info('Initial schema applied successfully');
  }

  private async runMigration(migration: Migration): Promise<void> {
    logger.info(`Running migration: ${migration.name}`);

    await this.db.transaction(async client => {
      // Execute the migration SQL
      await client.query(migration.sql);

      // Record the migration as applied
      await client.query('INSERT INTO migrations (name, sql) VALUES ($1, $2)', [
        migration.name,
        migration.sql,
      ]);
    });

    logger.info(`Migration completed: ${migration.name}`);
  }

  public async rollbackMigration(migrationName: string): Promise<void> {
    // This is a basic rollback - in production you'd want more sophisticated rollback handling
    logger.warn(`Rolling back migration: ${migrationName}`);

    await this.db.query('DELETE FROM migrations WHERE name = $1', [
      migrationName,
    ]);

    logger.info(`Migration rollback completed: ${migrationName}`);
  }

  public async getMigrationStatus(): Promise<Migration[]> {
    await this.ensureMigrationsTable();

    const appliedMigrations = await this.db.query<{
      name: string;
      applied_at: Date;
    }>('SELECT name, applied_at FROM migrations ORDER BY applied_at');

    const migrationFiles = this.getMigrationFiles();

    return migrationFiles.map(file => ({
      ...file,
      applied_at: appliedMigrations.rows.find(m => m.name === file.name)
        ?.applied_at,
    }));
  }
}

// CLI interface for running migrations
export async function runMigrations(): Promise<void> {
  const migrationManager = new MigrationManager();
  await migrationManager.runMigrations();
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Migration process failed', error);
      process.exit(1);
    });
}
