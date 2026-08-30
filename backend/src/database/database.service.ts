import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.pool = new Pool({
      host: this.configService.get<string>('POSTGRES_HOST', 'localhost'),
      port: this.configService.get<number>('POSTGRES_PORT', 5432),
      user: this.configService.get<string>('POSTGRES_USER', 'pedidos_user'),
      password: this.configService.get<string>('POSTGRES_PASSWORD', 'pedidos_pass'),
      database: this.configService.get<string>('POSTGRES_DB', 'pedidos_db'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.logger.log('Conexão com PostgreSQL inicializada.');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Pool do PostgreSQL encerrado.');
  }

  async query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
    const start = Date.now();
    const res = await this.pool.query<R>(text, params);
    const duration = Date.now() - start;
    this.logger.debug(`Query executada [${duration}ms]: ${text.substring(0, 100)}`);
    return res;
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
