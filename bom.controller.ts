import { Request, Response } from 'express';
import { BOMServiceImpl } from '../services/bom.service';
import { createBOMItemSchema, updateBOMItemSchema, bomFilterSchema } from '../validation/bom.validation';
import { z } from 'zod';

export class BOMController {
  private bomService: BOMServiceImpl;

  constructor() {
    this.bomService = new BOMServiceImpl();
  }

  // GET /api/projects/:projectId/bom
  getBOMTree = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const bomTree = await this.bomService.getBOMTree(projectId);
      res.json({
        success: true,
        data: bomTree,
        message: 'BOM tree retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting BOM tree:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/projects/:projectId/bom/search
  searchBOM = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      // Validate and parse filters
      const filterResult = bomFilterSchema.safeParse(req.query);
      if (!filterResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid filter parameters',
          details: filterResult.error.errors
        });
        return;
      }

      const filters = filterResult.data;
      
      // Convert string dates to Date objects
      const processedFilters = {
        ...filters,
        expectedDeliveryFrom: filters.expectedDeliveryFrom ? new Date(filters.expectedDeliveryFrom) : undefined,
        expectedDeliveryTo: filters.expectedDeliveryTo ? new Date(filters.expectedDeliveryTo) : undefined
      };
      
      const bomItems = await this.bomService.getBOMWithFilters(projectId, processedFilters);
      
      res.json({
        success: true,
        data: bomItems,
        filters: filters,
        message: 'BOM search completed successfully'
      });
    } catch (error) {
      console.error('Error searching BOM:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/projects/:projectId/bom
  createBOMItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      // Add projectId to request body
      const itemData = { ...req.body, projectId };

      // Validate request body
      const validationResult = createBOMItemSchema.safeParse(itemData);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
        return;
      }

      // Convert string dates to Date objects
      const processedData = {
        ...validationResult.data,
        rfqDate: validationResult.data.rfqDate ? new Date(validationResult.data.rfqDate) : undefined,
        expectedDelivery: validationResult.data.expectedDelivery ? new Date(validationResult.data.expectedDelivery) : undefined,
        receivedDate: validationResult.data.receivedDate ? new Date(validationResult.data.receivedDate) : undefined
      };
      
      const bomItem = await this.bomService.createBOMItem(processedData);
      
      res.status(201).json({
        success: true,
        data: bomItem,
        message: 'BOM item created successfully'
      });
    } catch (error) {
      console.error('Error creating BOM item:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // PUT /api/bom-items/:id
  updateBOMItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'BOM item ID is required' });
        return;
      }

      // Validate request body
      const validationResult = updateBOMItemSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        });
        return;
      }

      // Convert string dates to Date objects
      const processedData = {
        ...validationResult.data,
        rfqDate: validationResult.data.rfqDate ? new Date(validationResult.data.rfqDate) : undefined,
        expectedDelivery: validationResult.data.expectedDelivery ? new Date(validationResult.data.expectedDelivery) : undefined,
        receivedDate: validationResult.data.receivedDate ? new Date(validationResult.data.receivedDate) : undefined
      };
      
      const bomItem = await this.bomService.updateBOMItem(id, processedData);
      
      res.json({
        success: true,
        data: bomItem,
        message: 'BOM item updated successfully'
      });
    } catch (error) {
      console.error('Error updating BOM item:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
        return;
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // DELETE /api/bom-items/:id
  deleteBOMItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'BOM item ID is required' });
        return;
      }

      await this.bomService.deleteBOMItem(id);
      
      res.json({
        success: true,
        message: 'BOM item deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting BOM item:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Not found',
          message: error.message
        });
        return;
      }

      if (error instanceof Error && error.message.includes('children')) {
        res.status(400).json({
          success: false,
          error: 'Bad request',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/bom-items/:id
  getBOMItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ error: 'BOM item ID is required' });
        return;
      }

      const bomItem = await this.bomService.bomRepository.findById(id);
      
      if (!bomItem) {
        res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'BOM item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: bomItem,
        message: 'BOM item retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting BOM item:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/projects/:projectId/bom/quantities
  getTotalQuantities = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const quantities = await this.bomService.recalculateQuantities(projectId);
      
      // Convert Map to object for JSON response
      const quantitiesObj = Object.fromEntries(quantities);

      res.json({
        success: true,
        data: quantitiesObj,
        message: 'Total quantities calculated successfully'
      });
    } catch (error) {
      console.error('Error calculating quantities:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/projects/:projectId/bom/duplicates
  getDuplicatePartNumbers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const duplicates = await this.bomService.bomRepository.findDuplicatePartNumbers(projectId);

      res.json({
        success: true,
        data: duplicates,
        message: 'Duplicate part numbers retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting duplicates:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}