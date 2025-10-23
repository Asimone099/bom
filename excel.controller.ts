import { Request, Response } from 'express';
import { ExcelServiceImpl } from '../services/excel.service';
import { z } from 'zod';

const importOptionsSchema = z.object({
  projectId: z.string().uuid(),
  mapping: z.record(z.string()),
  skipFirstRow: z.boolean().default(true),
  validateOnly: z.boolean().default(false)
});

const exportOptionsSchema = z.object({
  projectId: z.string().uuid(),
  includeHierarchy: z.boolean().default(true),
  includeCustomFields: z.boolean().default(false),
  filters: z.any().optional()
});

export class ExcelController {
  private excelService: ExcelServiceImpl;

  constructor() {
    this.excelService = new ExcelServiceImpl();
  }

  // POST /api/projects/:projectId/import-excel
  importExcel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      // Parse options from request body
      const optionsResult = importOptionsSchema.safeParse({
        projectId,
        ...req.body
      });

      if (!optionsResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid import options',
          details: optionsResult.error.errors
        });
        return;
      }

      const options = optionsResult.data;

      // Validate column mapping
      if (!this.excelService.validateColumnMapping(options.mapping)) {
        res.status(400).json({
          success: false,
          error: 'Invalid column mapping. Required fields: partNumber, description, quantity, itemType'
        });
        return;
      }

      const result = await this.excelService.importFromExcel(req.file.buffer, options);

      res.json({
        success: result.success,
        data: result,
        message: result.success ? 
          `Import completed successfully. ${result.successfulRows}/${result.totalRows} rows processed.` :
          `Import completed with errors. ${result.successfulRows}/${result.totalRows} rows processed.`
      });

    } catch (error) {
      console.error('Excel import error:', error);
      res.status(500).json({
        success: false,
        error: 'Import failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/projects/:projectId/export-excel
  exportExcel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      const optionsResult = exportOptionsSchema.safeParse({
        projectId,
        ...req.query
      });

      if (!optionsResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid export options',
          details: optionsResult.error.errors
        });
        return;
      }

      const options = optionsResult.data;
      const buffer = await this.excelService.exportBOMToExcel(options);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="BOM_Export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);

    } catch (error) {
      console.error('Excel export error:', error);
      res.status(500).json({
        success: false,
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/projects/:projectId/export-kpi-report
  exportKPIReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      const buffer = await this.excelService.exportKPIReport(projectId);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="KPI_Report_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);

    } catch (error) {
      console.error('KPI report export error:', error);
      res.status(500).json({
        success: false,
        error: 'KPI report export failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/excel/import-template
  downloadImportTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const buffer = await this.excelService.generateImportTemplate();

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="BOM_Import_Template.xlsx"');
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);

    } catch (error) {
      console.error('Template download error:', error);
      res.status(500).json({
        success: false,
        error: 'Template download failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/projects/:projectId/validate-excel
  validateExcel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      const optionsResult = importOptionsSchema.safeParse({
        projectId,
        validateOnly: true,
        ...req.body
      });

      if (!optionsResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid validation options',
          details: optionsResult.error.errors
        });
        return;
      }

      const options = optionsResult.data;
      const result = await this.excelService.importFromExcel(req.file.buffer, options);

      res.json({
        success: true,
        data: {
          isValid: result.success,
          totalRows: result.totalRows,
          errors: result.errors,
          preview: result.errors.length === 0 ? 'File is valid and ready for import' : 'File contains errors'
        },
        message: result.success ? 
          'File validation successful' : 
          `File validation found ${result.errors.length} errors`
      });

    } catch (error) {
      console.error('Excel validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/excel/column-mappings
  getStandardColumnMappings = async (req: Request, res: Response): Promise<void> => {
    try {
      const mappings = {
        italian: {
          'Part Number': 'partNumber',
          'Codice': 'partNumber',
          'PN': 'partNumber',
          'Descrizione': 'description',
          'Description': 'description',
          'Quantità': 'quantity',
          'Quantity': 'quantity',
          'Qty': 'quantity',
          'Tipo': 'itemType',
          'Type': 'itemType',
          'Item Type': 'itemType',
          'Costo Stimato': 'estimatedCost',
          'Estimated Cost': 'estimatedCost',
          'Cost': 'estimatedCost',
          'RFQ Status': 'rfqStatus',
          'RFQ': 'rfqStatus',
          'Data RFQ': 'rfqDate',
          'RFQ Date': 'rfqDate',
          'MOQ': 'moq',
          'Data Consegna': 'expectedDelivery',
          'Expected Delivery': 'expectedDelivery',
          'Delivery Date': 'expectedDelivery',
          'Obsoleto': 'obsolete',
          'Obsolete': 'obsolete',
          'Stato Evasione': 'procurementStatus',
          'Procurement Status': 'procurementStatus',
          'Status': 'procurementStatus'
        },
        english: {
          'Part Number': 'partNumber',
          'PN': 'partNumber',
          'Code': 'partNumber',
          'Description': 'description',
          'Quantity': 'quantity',
          'Qty': 'quantity',
          'Type': 'itemType',
          'Item Type': 'itemType',
          'Estimated Cost': 'estimatedCost',
          'Cost': 'estimatedCost',
          'RFQ Status': 'rfqStatus',
          'RFQ Date': 'rfqDate',
          'MOQ': 'moq',
          'Expected Delivery': 'expectedDelivery',
          'Delivery Date': 'expectedDelivery',
          'Obsolete': 'obsolete',
          'Procurement Status': 'procurementStatus',
          'Status': 'procurementStatus'
        }
      };

      res.json({
        success: true,
        data: mappings,
        message: 'Standard column mappings retrieved successfully'
      });

    } catch (error) {
      console.error('Error getting column mappings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get column mappings',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}