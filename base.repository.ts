import { PoolClient } from 'pg';
import DatabaseConnection from '../database/connection';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export abstract class BaseRepository {
  protected db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  protected async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.db.query(text, params);
  }

  protected async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  protected buildWhereClause(filters: Record<string, any>, startIndex: number = 1): { 
    whereClause: string; 
    params: any[]; 
    nextIndex: number; 
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = startIndex;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          // Handle IN clause
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          conditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else if (typeof value === 'string' && key.includes('_like')) {
          // Handle LIKE clause
          const actualKey = key.replace('_like', '');
          conditions.push(`${actualKey} ILIKE $${paramIndex++}`);
          params.push(`%${value}%`);
        } else if (key.includes('_gte')) {
          // Handle greater than or equal
          const actualKey = key.replace('_gte', '');
          conditions.push(`${actualKey} >= $${paramIndex++}`);
          params.push(value);
        } else if (key.includes('_lte')) {
          // Handle less than or equal
          const actualKey = key.replace('_lte', '');
          conditions.push(`${actualKey} <= $${paramIndex++}`);
          params.push(value);
        } else {
          // Handle exact match
          conditions.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return {
      whereClause,
      params,
      nextIndex: paramIndex
    };
  }

  protected buildOrderClause(orderBy?: string, orderDirection: 'ASC' | 'DESC' = 'ASC'): string {
    if (!orderBy) return '';
    return `ORDER BY ${orderBy} ${orderDirection}`;
  }

  protected buildLimitClause(limit?: number, offset?: number): { 
    limitClause: string; 
    params: any[]; 
  } {
    const params: any[] = [];
    let limitClause = '';

    if (limit !== undefined) {
      limitClause += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    if (offset !== undefined) {
      limitClause += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }

    return { limitClause, params };
  }

  protected mapRowToEntity<T>(row: any, mapper: (row: any) => T): T {
    return mapper(row);
  }

  protected mapRowsToEntities<T>(rows: any[], mapper: (row: any) => T): T[] {
    return rows.map(row => this.mapRowToEntity(row, mapper));
  }
}