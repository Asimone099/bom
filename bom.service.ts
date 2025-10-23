import { BOMRepositoryImpl } from '../repositories/bom.repository';
import { BOMItem, CreateBOMItemDto, UpdateBOMItemDto, BOMFilterCriteria } from '../types/bom.types';

export interface BOMService {
  getBOMTree(projectId: string): Promise<BOMItem[]>;
  getBOMWithFilters(projectId: string, filters: BOMFilterCriteria): Promise<BOMItem[]>;
  createBOMItem(item: CreateBOMItemDto): Promise<BOMItem>;
  updateBOMItem(id: string, item: UpdateBOMItemDto): Promise<BOMItem>;
  deleteBOMItem(id: string): Promise<void>;
  validatePartNumberUniqueness(projectId: string, partNumber: string, excludeId?: string): Promise<boolean>;
  recalculateQuantities(projectId: string): Promise<Map<string, number>>;
  buildHierarchicalTree(items: BOMItem[]): BOMItem[];
}

export class BOMServiceImpl implements BOMService {
  public bomRepository: BOMRepositoryImpl; // Public accessor for controller

  constructor() {
    this.bomRepository = new BOMRepositoryImpl();
  }

  async getBOMTree(projectId: string): Promise<BOMItem[]> {
    const items = await this.bomRepository.findByProject(projectId);
    return this.buildHierarchicalTree(items);
  }

  async getBOMWithFilters(projectId: string, filters: BOMFilterCriteria): Promise<BOMItem[]> {
    const items = await this.bomRepository.findWithFilters(projectId, filters);
    return this.buildHierarchicalTree(items);
  }

  async createBOMItem(item: CreateBOMItemDto): Promise<BOMItem> {
    // Validate part number uniqueness
    const isUnique = await this.validatePartNumberUniqueness(item.projectId, item.partNumber);
    if (!isUnique) {
      throw new Error(`Part number ${item.partNumber} already exists in this project`);
    }

    // Validate parent exists if specified
    if (item.parentId) {
      const parent = await this.bomRepository.findById(item.parentId);
      if (!parent) {
        throw new Error('Parent item not found');
      }
      
      // Validate parent is in same project
      if (parent.projectId !== item.projectId) {
        throw new Error('Parent item must be in the same project');
      }

      // Validate item type hierarchy (assembly > subassembly > part)
      if (!this.isValidHierarchy(parent.itemType, item.itemType)) {
        throw new Error('Invalid item type hierarchy');
      }
    }

    return this.bomRepository.create(item);
  }

  async updateBOMItem(id: string, item: UpdateBOMItemDto): Promise<BOMItem> {
    const existingItem = await this.bomRepository.findById(id);
    if (!existingItem) {
      throw new Error('BOM item not found');
    }

    // Validate part number uniqueness if changed
    if (item.partNumber && item.partNumber !== existingItem.partNumber) {
      const isUnique = await this.validatePartNumberUniqueness(
        existingItem.projectId, 
        item.partNumber, 
        id
      );
      if (!isUnique) {
        throw new Error(`Part number ${item.partNumber} already exists in this project`);
      }
    }

    // Validate item type change doesn't break hierarchy
    if (item.itemType && item.itemType !== existingItem.itemType) {
      await this.validateItemTypeChange(existingItem, item.itemType);
    }

    return this.bomRepository.update(id, item);
  }

  async deleteBOMItem(id: string): Promise<void> {
    const item = await this.bomRepository.findById(id);
    if (!item) {
      throw new Error('BOM item not found');
    }

    // The repository will check for children and throw error if any exist
    await this.bomRepository.delete(id);
  }

  async validatePartNumberUniqueness(projectId: string, partNumber: string, excludeId?: string): Promise<boolean> {
    const duplicates = await this.bomRepository.findDuplicatePartNumbers(projectId);
    
    if (excludeId) {
      // For updates, check if the part number exists on other items
      const items = await this.bomRepository.findByProject(projectId);
      const existingItem = items.find((item: BOMItem) => 
        item.partNumber === partNumber && item.id !== excludeId
      );
      return !existingItem;
    }
    
    return !duplicates.includes(partNumber);
  }

  async recalculateQuantities(projectId: string): Promise<Map<string, number>> {
    return this.bomRepository.calculateTotalQuantities(projectId);
  }

  buildHierarchicalTree(items: BOMItem[]): BOMItem[] {
    const itemMap = new Map<string, BOMItem>();
    const rootItems: BOMItem[] = [];

    // First pass: create map and initialize children arrays
    items.forEach(item => {
      item.children = [];
      itemMap.set(item.id, item);
    });

    // Second pass: build hierarchy
    items.forEach(item => {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children!.push(item);
        }
      } else {
        rootItems.push(item);
      }
    });

    // Sort children by path for consistent ordering
    const sortChildren = (items: BOMItem[]) => {
      items.sort((a, b) => a.path.localeCompare(b.path));
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortChildren(item.children);
        }
      });
    };

    sortChildren(rootItems);
    return rootItems;
  }

  private isValidHierarchy(parentType: string, childType: string): boolean {
    const hierarchy: Record<string, string[]> = {
      assembly: ['subassembly', 'part'],
      subassembly: ['part'],
      part: []
    };

    return hierarchy[parentType]?.includes(childType) || false;
  }

  private async validateItemTypeChange(existingItem: BOMItem, newType: string): Promise<void> {
    // Check if item has children
    const allItems = await this.bomRepository.findByProject(existingItem.projectId);
    const children = allItems.filter(item => item.parentId === existingItem.id);

    if (children.length > 0) {
      // Validate new type can contain existing children
      const validChildTypes = this.getValidChildTypes(newType);
      const invalidChildren = children.filter(child => !validChildTypes.includes(child.itemType));
      
      if (invalidChildren.length > 0) {
        throw new Error(
          `Cannot change item type to ${newType}. ` +
          `It contains children of incompatible types: ${invalidChildren.map(c => c.itemType).join(', ')}`
        );
      }
    }

    // Check if parent allows this new type
    if (existingItem.parentId) {
      const parent = await this.bomRepository.findById(existingItem.parentId);
      if (parent && !this.isValidHierarchy(parent.itemType, newType)) {
        throw new Error(
          `Cannot change item type to ${newType}. ` +
          `Parent type ${parent.itemType} does not allow this child type.`
        );
      }
    }
  }

  private getValidChildTypes(parentType: string): string[] {
    const hierarchy = {
      assembly: ['subassembly', 'part'],
      subassembly: ['part'],
      part: []
    };

    return hierarchy[parentType as keyof typeof hierarchy] || [];
  }
}