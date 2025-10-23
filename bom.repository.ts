import { PoolClient } from 'pg';
import { BaseRepository } from './base.repository';
import { BOMItem, CreateBOMItemDto, UpdateBOMItemDto, BOMFilterCriteria } from '../types/bom.types';

export interface BOMRepository {
  findByProject(projectId: string): Promise<BOMItem[]>;
  findById(id: string): Promise<BOMItem | null>;
  create(item: CreateBOMItemDto): Promise<BOMItem>;
  update(id: string, item: UpdateBOMItemDto): Promise<BOMItem>;
  delete(id: string): Promise<void>;
  findDuplicatePartNumbers(projectId: string): Promise<string[]>;
  calculateTotalQuantities(projectId: string): Promise<Map<string, number>>;
  findWithFilters(projectId: string, filters: BOMFilterCriteria): Promise<BOMItem[]>;
}

export class BOMRepositoryImpl extends BaseRepository implements BOMRepository {
  
  async findByProject(projectId: string): Promise<BOMItem[]> {
    const query = `
      SELECT 
        b.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cf.id,
              'fieldName', cf.field_name,
              'fieldValue', cf.field_value,
              'fieldType', cf.field_type
            )
          ) FILTER (WHERE cf.id IS NOT NULL), 
          '[]'
        ) as custom_fields
      FROM bom_items b
      LEFT JOIN custom_fields cf ON b.id = cf.bom_item_id
      WHERE b.project_id = $1
      GROUP BY b.id
      ORDER BY b.path
    `;
    
    const result = await this.query<any>(query, [projectId]);
    return this.mapRowsToEntities(result.rows, this.mapRowToBOMItem);
  }

  async findById(id: string): Promise<BOMItem | null> {
    const query = `
      SELECT 
        b.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cf.id,
              'fieldName', cf.field_name,
              'fieldValue', cf.field_value,
              'fieldType', cf.field_type
            )
          ) FILTER (WHERE cf.id IS NOT NULL), 
          '[]'
        ) as custom_fields
      FROM bom_items b
      LEFT JOIN custom_fields cf ON b.id = cf.bom_item_id
      WHERE b.id = $1
      GROUP BY b.id
    `;
    
    const result = await this.query<any>(query, [id]);
    return result.rows.length > 0 ? this.mapRowToBOMItem(result.rows[0]) : null;
  }

  async create(item: CreateBOMItemDto): Promise<BOMItem> {
    return this.transaction(async (client: PoolClient) => {
      // Calculate level and path
      let level = 0;
      let path = '';
      
      if (item.parentId) {
        // Get parent info
        const parentResult = await client.query(
          'SELECT level, path FROM bom_items WHERE id = $1',
          [item.parentId]
        );
        
        if (parentResult.rows.length === 0) {
          throw new Error('Parent item not found');
        }
        
        const parent = parentResult.rows[0];
        level = parent.level + 1;
        
        // Get next sibling number
        const siblingResult = await client.query(
          `SELECT COALESCE(MAX(CAST(split_part(path, '.', $1) AS INTEGER)), 0) + 1 as next_num
           FROM bom_items 
           WHERE parent_id = $2 AND project_id = $3`,
          [level + 1, item.parentId, item.projectId]
        );
        
        const nextNum = siblingResult.rows[0].next_num;
        path = `${parent.path}.${nextNum}`;
      } else {
        // Root level item
        const rootResult = await client.query(
          `SELECT COALESCE(MAX(CAST(path AS INTEGER)), 0) + 1 as next_num
           FROM bom_items 
           WHERE parent_id IS NULL AND project_id = $1`,
          [item.projectId]
        );
        
        const nextNum = rootResult.rows[0].next_num;
        path = nextNum.toString();
      }

      // Insert the BOM item
      const insertQuery = `
        INSERT INTO bom_items (
          project_id, parent_id, part_number, description, quantity, item_type,
          estimated_cost, rfq_status, rfq_date, moq, expected_delivery, obsolete,
          procurement_status, actual_cost, received_date, level, path,
          supplier, supplier_part_number, manufacturer, manufacturer_part_number,
          revision, notes, unit_of_measure, lead_time_days, category, subcategory,
          material, finish, weight_kg, dimensions, tolerance, critical_item,
          substitute_part_number, compliance_standards, environmental_rating,
          lifecycle_status, last_purchase_date, last_purchase_price,
          inventory_location, stock_quantity, reorder_point, safety_stock
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43
        )
        RETURNING *
      `;

      const values = [
        item.projectId,
        item.parentId || null,
        item.partNumber,
        item.description,
        item.quantity,
        item.itemType,
        item.estimatedCost || null,
        item.rfqStatus || null,
        item.rfqDate || null,
        item.moq || null,
        item.expectedDelivery || null,
        item.obsolete || false,
        item.procurementStatus || 'pending',
        item.actualCost || null,
        item.receivedDate || null,
        level,
        path,
        // Extended fields
        item.supplier || null,
        item.supplierPartNumber || null,
        item.manufacturer || null,
        item.manufacturerPartNumber || null,
        item.revision || null,
        item.notes || null,
        item.unitOfMeasure || 'pcs',
        item.leadTimeDays || null,
        item.category || null,
        item.subcategory || null,
        item.material || null,
        item.finish || null,
        item.weightKg || null,
        item.dimensions || null,
        item.tolerance || null,
        item.criticalItem || false,
        item.substitutePartNumber || null,
        item.complianceStandards || null,
        item.environmentalRating || null,
        item.lifecycleStatus || 'active',
        item.lastPurchaseDate || null,
        item.lastPurchasePrice || null,
        item.inventoryLocation || null,
        item.stockQuantity || 0,
        item.reorderPoint || 0,
        item.safetyStock || 0
      ];

      const result = await client.query(insertQuery, values);
      return this.mapRowToBOMItem(result.rows[0]);
    });
  }

  async update(id: string, item: UpdateBOMItemDto): Promise<BOMItem> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    Object.entries(item).forEach(([key, value]) => {
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
      UPDATE bom_items 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query<any>(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('BOM item not found');
    }

    return this.mapRowToBOMItem(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    // Check if item has children
    const childrenResult = await this.query(
      'SELECT COUNT(*) as count FROM bom_items WHERE parent_id = $1',
      [id]
    );

    if (parseInt(childrenResult.rows[0].count) > 0) {
      throw new Error('Cannot delete item with children. Delete children first.');
    }

    const result = await this.query('DELETE FROM bom_items WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      throw new Error('BOM item not found');
    }
  }

  async findDuplicatePartNumbers(projectId: string): Promise<string[]> {
    const query = `
      SELECT part_number 
      FROM bom_items 
      WHERE project_id = $1 
      GROUP BY part_number 
      HAVING COUNT(*) > 1
    `;
    
    const result = await this.query<{ part_number: string }>(query, [projectId]);
    return result.rows.map(row => row.part_number);
  }

  async calculateTotalQuantities(projectId: string): Promise<Map<string, number>> {
    const query = `
      WITH RECURSIVE bom_tree AS (
        -- Base case: root items
        SELECT id, part_number, quantity, 1 as multiplier
        FROM bom_items 
        WHERE project_id = $1 AND parent_id IS NULL
        
        UNION ALL
        
        -- Recursive case: children
        SELECT b.id, b.part_number, b.quantity, bt.multiplier * b.quantity
        FROM bom_items b
        INNER JOIN bom_tree bt ON b.parent_id = bt.id
        WHERE b.project_id = $1
      )
      SELECT part_number, SUM(multiplier) as total_quantity
      FROM bom_tree
      GROUP BY part_number
    `;
    
    const result = await this.query<{ part_number: string; total_quantity: number }>(query, [projectId]);
    
    const quantities = new Map<string, number>();
    result.rows.forEach(row => {
      quantities.set(row.part_number, row.total_quantity);
    });
    
    return quantities;
  }

  async findWithFilters(projectId: string, filters: BOMFilterCriteria): Promise<BOMItem[]> {
    let baseQuery = `
      SELECT 
        b.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cf.id,
              'fieldName', cf.field_name,
              'fieldValue', cf.field_value,
              'fieldType', cf.field_type
            )
          ) FILTER (WHERE cf.id IS NOT NULL), 
          '[]'
        ) as custom_fields
      FROM bom_items b
      LEFT JOIN custom_fields cf ON b.id = cf.bom_item_id
      WHERE b.project_id = $1
    `;

    const params: any[] = [projectId];
    let paramIndex = 2;

    // Apply filters
    if (filters.itemType) {
      baseQuery += ` AND b.item_type = $${paramIndex++}`;
      params.push(filters.itemType);
    }

    if (filters.procurementStatus) {
      baseQuery += ` AND b.procurement_status = $${paramIndex++}`;
      params.push(filters.procurementStatus);
    }

    if (filters.obsolete !== undefined) {
      baseQuery += ` AND b.obsolete = $${paramIndex++}`;
      params.push(filters.obsolete);
    }

    if (filters.partNumber) {
      baseQuery += ` AND b.part_number ILIKE $${paramIndex++}`;
      params.push(`%${filters.partNumber}%`);
    }

    if (filters.description) {
      baseQuery += ` AND b.description ILIKE $${paramIndex++}`;
      params.push(`%${filters.description}%`);
    }

    if (filters.minCost) {
      baseQuery += ` AND b.estimated_cost >= $${paramIndex++}`;
      params.push(filters.minCost);
    }

    if (filters.maxCost) {
      baseQuery += ` AND b.estimated_cost <= $${paramIndex++}`;
      params.push(filters.maxCost);
    }

    if (filters.rfqStatus) {
      baseQuery += ` AND b.rfq_status ILIKE $${paramIndex++}`;
      params.push(`%${filters.rfqStatus}%`);
    }

    if (filters.expectedDeliveryFrom) {
      baseQuery += ` AND b.expected_delivery >= $${paramIndex++}`;
      params.push(filters.expectedDeliveryFrom);
    }

    if (filters.expectedDeliveryTo) {
      baseQuery += ` AND b.expected_delivery <= $${paramIndex++}`;
      params.push(filters.expectedDeliveryTo);
    }

    baseQuery += ` GROUP BY b.id ORDER BY b.path`;

    const result = await this.query<any>(baseQuery, params);
    return this.mapRowsToEntities(result.rows, this.mapRowToBOMItem);
  }

  private mapRowToBOMItem(row: any): BOMItem {
    return {
      id: row.id,
      projectId: row.project_id,
      parentId: row.parent_id,
      partNumber: row.part_number,
      description: row.description,
      quantity: row.quantity,
      itemType: row.item_type,
      estimatedCost: row.estimated_cost,
      rfqStatus: row.rfq_status,
      rfqDate: row.rfq_date,
      moq: row.moq,
      expectedDelivery: row.expected_delivery,
      obsolete: row.obsolete,
      procurementStatus: row.procurement_status,
      actualCost: row.actual_cost,
      receivedDate: row.received_date,
      level: row.level,
      path: row.path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      
      // Extended fields
      supplier: row.supplier,
      supplierPartNumber: row.supplier_part_number,
      manufacturer: row.manufacturer,
      manufacturerPartNumber: row.manufacturer_part_number,
      revision: row.revision,
      notes: row.notes,
      unitOfMeasure: row.unit_of_measure,
      leadTimeDays: row.lead_time_days,
      category: row.category,
      subcategory: row.subcategory,
      material: row.material,
      finish: row.finish,
      weightKg: row.weight_kg,
      dimensions: row.dimensions,
      tolerance: row.tolerance,
      criticalItem: row.critical_item,
      substitutePartNumber: row.substitute_part_number,
      complianceStandards: row.compliance_standards,
      environmentalRating: row.environmental_rating,
      lifecycleStatus: row.lifecycle_status,
      lastPurchaseDate: row.last_purchase_date,
      lastPurchasePrice: row.last_purchase_price,
      inventoryLocation: row.inventory_location,
      stockQuantity: row.stock_quantity,
      reorderPoint: row.reorder_point,
      safetyStock: row.safety_stock,
      
      customFields: row.custom_fields || []
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}