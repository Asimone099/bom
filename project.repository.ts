import { BaseRepository } from './base.repository';
import { Project } from '../types/bom.types';

export interface CreateProjectDto {
  name: string;
  description?: string;
  budget?: number;
  createdBy: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  budget?: number;
}

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  findByUserId(userId: string): Promise<Project[]>;
  create(project: CreateProjectDto): Promise<Project>;
  update(id: string, project: UpdateProjectDto): Promise<Project>;
  delete(id: string): Promise<void>;
}

export class ProjectRepositoryImpl extends BaseRepository implements ProjectRepository {
  
  async findAll(): Promise<Project[]> {
    const query = `
      SELECT p.*, u.username as created_by_username
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `;
    
    const result = await this.query<any>(query);
    return this.mapRowsToEntities(result.rows, this.mapRowToProject);
  }

  async findById(id: string): Promise<Project | null> {
    const query = `
      SELECT p.*, u.username as created_by_username
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;
    
    const result = await this.query<any>(query, [id]);
    return result.rows.length > 0 ? this.mapRowToProject(result.rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<Project[]> {
    const query = `
      SELECT p.*, u.username as created_by_username
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.created_by = $1
      ORDER BY p.created_at DESC
    `;
    
    const result = await this.query<any>(query, [userId]);
    return this.mapRowsToEntities(result.rows, this.mapRowToProject);
  }

  async create(project: CreateProjectDto): Promise<Project> {
    const query = `
      INSERT INTO projects (name, description, budget, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      project.name,
      project.description || null,
      project.budget || null,
      project.createdBy
    ];

    const result = await this.query<any>(query, values);
    return this.mapRowToProject(result.rows[0]);
  }

  async update(id: string, project: UpdateProjectDto): Promise<Project> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    Object.entries(project).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = this.camelToSnake(key);
        setClauses.push(`${dbKey} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id); // Add id for WHERE clause

    const query = `
      UPDATE projects 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query<any>(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return this.mapRowToProject(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    // Check if project has BOM items
    const bomItemsResult = await this.query(
      'SELECT COUNT(*) as count FROM bom_items WHERE project_id = $1',
      [id]
    );

    if (parseInt(bomItemsResult.rows[0].count) > 0) {
      throw new Error('Cannot delete project with BOM items. Delete BOM items first.');
    }

    const result = await this.query('DELETE FROM projects WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Project not found');
    }
  }

  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      budget: row.budget,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}