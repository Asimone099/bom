export interface BOMItem {
  id: string;
  projectId: string;
  parentId?: string;
  partNumber: string;
  description: string;
  quantity: number;
  itemType: 'assembly' | 'subassembly' | 'part';
  estimatedCost?: number;
  rfqStatus?: string;
  rfqDate?: Date;
  moq?: number;
  expectedDelivery?: Date;
  obsolete: boolean;
  procurementStatus: 'pending' | 'in_progress' | 'completed' | 'delayed';
  actualCost?: number;
  receivedDate?: Date;
  level: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Extended columns
  supplier?: string;
  supplierPartNumber?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  revision?: string;
  notes?: string;
  unitOfMeasure?: string;
  leadTimeDays?: number;
  category?: string;
  subcategory?: string;
  material?: string;
  finish?: string;
  weightKg?: number;
  dimensions?: string;
  tolerance?: string;
  criticalItem?: boolean;
  substitutePartNumber?: string;
  complianceStandards?: string;
  environmentalRating?: string;
  lifecycleStatus?: 'active' | 'obsolete' | 'discontinued' | 'development' | 'prototype';
  lastPurchaseDate?: Date;
  lastPurchasePrice?: number;
  inventoryLocation?: string;
  stockQuantity?: number;
  reorderPoint?: number;
  safetyStock?: number;
  
  children?: BOMItem[];
  customFields?: CustomField[];
}

export interface CustomField {
  id: string;
  bomItemId: string;
  fieldName: string;
  fieldValue: string;
  fieldType: 'string' | 'number' | 'date' | 'boolean' | 'select';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateBOMItemDto {
  projectId: string;
  parentId?: string;
  partNumber: string;
  description: string;
  quantity: number;
  itemType: 'assembly' | 'subassembly' | 'part';
  estimatedCost?: number;
  rfqStatus?: string;
  rfqDate?: Date;
  moq?: number;
  expectedDelivery?: Date;
  obsolete?: boolean;
  procurementStatus?: 'pending' | 'in_progress' | 'completed' | 'delayed';
  actualCost?: number;
  receivedDate?: Date;
  
  // Extended fields
  supplier?: string;
  supplierPartNumber?: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  revision?: string;
  notes?: string;
  unitOfMeasure?: string;
  leadTimeDays?: number;
  category?: string;
  subcategory?: string;
  material?: string;
  finish?: string;
  weightKg?: number;
  dimensions?: string;
  tolerance?: string;
  criticalItem?: boolean;
  substitutePartNumber?: string;
  complianceStandards?: string;
  environmentalRating?: string;
  lifecycleStatus?: 'active' | 'obsolete' | 'discontinued' | 'development' | 'prototype';
  lastPurchaseDate?: Date;
  lastPurchasePrice?: number;
  inventoryLocation?: string;
  stockQuantity?: number;
  reorderPoint?: number;
  safetyStock?: number;
}

export interface UpdateBOMItemDto {
  partNumber?: string;
  description?: string;
  quantity?: number;
  itemType?: 'assembly' | 'subassembly' | 'part';
  estimatedCost?: number;
  rfqStatus?: string;
  rfqDate?: Date;
  moq?: number;
  expectedDelivery?: Date;
  obsolete?: boolean;
  procurementStatus?: 'pending' | 'in_progress' | 'completed' | 'delayed';
  actualCost?: number;
  receivedDate?: Date;
}

export interface BOMFilterCriteria {
  itemType?: 'assembly' | 'subassembly' | 'part';
  procurementStatus?: 'pending' | 'in_progress' | 'completed' | 'delayed';
  obsolete?: boolean;
  partNumber?: string;
  description?: string;
  minCost?: number;
  maxCost?: number;
  rfqStatus?: string;
  expectedDeliveryFrom?: Date;
  expectedDeliveryTo?: Date;
}