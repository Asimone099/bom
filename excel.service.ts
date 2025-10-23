import ExcelJS from 'exceljs';
import { BOMRepositoryImpl } from '../repositories/bom.repository';
import { BOMServiceImpl } from './bom.service';
import { 
  ColumnMapping, 
  ImportResult, 
  ImportError, 
  ExcelImportOptions, 
  ExcelExportOptions,
  STANDARD_BOM_FIELDS,
  ITEM_TYPE_MAPPING,
  PROCUREMENT_STATUS_MAPPING
} from '../types/excel.types';
import { CreateBOMItemDto, BOMItem, BOMFilterCriteria } from '../types/bom.types';

export interface ExcelService {
  importFromExcel(buffer: any, options: ExcelImportOptions): Promise<ImportResult>;
  exportBOMToExcel(options: ExcelExportOptions): Promise<any>;
  exportKPIReport(projectId: string): Promise<any>;
  generateImportTemplate(): Promise<any>;
  validateColumnMapping(mapping: ColumnMapping): boolean;
}

export class ExcelServiceImpl implements ExcelService {
  private bomRepository: BOMRepositoryImpl;
  private bomService: BOMServiceImpl;

  constructor() {
    this.bomRepository = new BOMRepositoryImpl();
    this.bomService = new BOMServiceImpl();
  }

  async importFromExcel(buffer: any, options: ExcelImportOptions): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successfulRows: 0,
      errors: [],
      createdItems: []
    };

    const rows = worksheet.getRows(options.skipFirstRow ? 2 : 1, worksheet.rowCount);
    result.totalRows = rows?.length || 0;

    if (!rows || rows.length === 0) {
      throw new Error('No data rows found in Excel file');
    }

    // Get header row for column mapping
    const headerRow = worksheet.getRow(1);
    const columnMap = this.buildColumnMap(headerRow, options.mapping);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber: number = (options.skipFirstRow ? i + 2 : i + 1);

      try {
        const bomItemData = this.parseRowToBOMItem(row, columnMap, options.projectId);
        
        if (options.validateOnly) {
          // Only validate, don't create
          await this.validateBOMItemData(bomItemData);
        } else {
          // Create the item
          const createdItem = await this.bomService.createBOMItem(bomItemData);
          result.createdItems.push(createdItem.id);
        }
        
        result.successfulRows++;
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: this.getRowData(row, columnMap)
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  async exportBOMToExcel(options: ExcelExportOptions): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('BOM Export');

    // Get BOM data
    let bomItems: BOMItem[];
    if (options.filters) {
      bomItems = await this.bomRepository.findWithFilters(options.projectId, options.filters);
    } else {
      bomItems = await this.bomRepository.findByProject(options.projectId);
    }

    // Define columns
    const columns = [
      { header: 'Level', key: 'level', width: 10 },
      { header: 'Path', key: 'path', width: 15 },
      { header: 'Part Number', key: 'partNumber', width: 20 },
      { header: 'Descrizione', key: 'description', width: 40 },
      { header: 'Tipo', key: 'itemType', width: 15 },
      { header: 'Quantità', key: 'quantity', width: 12 },
      { header: 'Costo Stimato', key: 'estimatedCost', width: 15 },
      { header: 'RFQ Status', key: 'rfqStatus', width: 15 },
      { header: 'Data RFQ', key: 'rfqDate', width: 15 },
      { header: 'MOQ', key: 'moq', width: 10 },
      { header: 'Data Consegna', key: 'expectedDelivery', width: 15 },
      { header: 'Obsoleto', key: 'obsolete', width: 10 },
      { header: 'Stato Evasione', key: 'procurementStatus', width: 15 },
      { header: 'Costo Effettivo', key: 'actualCost', width: 15 },
      { header: 'Data Ricevimento', key: 'receivedDate', width: 15 }
    ];

    worksheet.columns = columns;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add data rows
    bomItems.forEach((item: BOMItem, index: number) => {
      const row = worksheet.addRow({
        level: item.level,
        path: item.path,
        partNumber: item.partNumber,
        description: item.description,
        itemType: this.mapItemTypeToDisplay(item.itemType),
        quantity: item.quantity,
        estimatedCost: item.estimatedCost,
        rfqStatus: item.rfqStatus,
        rfqDate: item.rfqDate ? new Date(item.rfqDate) : null,
        moq: item.moq,
        expectedDelivery: item.expectedDelivery ? new Date(item.expectedDelivery) : null,
        obsolete: item.obsolete ? 'Sì' : 'No',
        procurementStatus: this.mapProcurementStatusToDisplay(item.procurementStatus),
        actualCost: item.actualCost,
        receivedDate: item.receivedDate ? new Date(item.receivedDate) : null
      });

      // Add indentation for hierarchy
      if (options.includeHierarchy && item.level > 0) {
        const partNumberCell = row.getCell('partNumber');
        partNumberCell.value = '  '.repeat(item.level) + item.partNumber;
      }

      // Highlight obsolete items
      if (item.obsolete) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEAA7' }
        };
      }
    });

    // Add custom fields if requested
    if (options.includeCustomFields) {
      await this.addCustomFieldsToExport(worksheet, bomItems);
    }

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      if (column.width && column.width < 10) {
        column.width = 10;
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async exportKPIReport(projectId: string): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('KPI Summary');
    
    // Get BOM data for calculations
    const bomItems = await this.bomRepository.findByProject(projectId);
    const quantities = await this.bomRepository.calculateTotalQuantities(projectId);

    // Calculate KPIs
    const totalItems = bomItems.length;
    const completedItems = bomItems.filter(item => item.procurementStatus === 'completed').length;
    const delayedItems = bomItems.filter(item => item.procurementStatus === 'delayed').length;
    const obsoleteItems = bomItems.filter(item => item.obsolete).length;
    
    const totalCost = bomItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
    const actualCost = bomItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);

    // Add KPI data
    summarySheet.addRow(['KPI Report', '', new Date()]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Metriche Generali']);
    summarySheet.addRow(['Totale Item', totalItems]);
    summarySheet.addRow(['Item Completati', completedItems]);
    summarySheet.addRow(['Item in Ritardo', delayedItems]);
    summarySheet.addRow(['Item Obsoleti', obsoleteItems]);
    summarySheet.addRow(['% Completamento', `${((completedItems / totalItems) * 100).toFixed(1)}%`]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Metriche Economiche']);
    summarySheet.addRow(['Costo Totale Stimato', `€ ${totalCost.toFixed(2)}`]);
    summarySheet.addRow(['Costo Totale Effettivo', `€ ${actualCost.toFixed(2)}`]);
    summarySheet.addRow(['Varianza', `€ ${(actualCost - totalCost).toFixed(2)}`]);

    // Detailed data sheet
    const detailSheet = workbook.addWorksheet('Dettaglio BOM');
    const buffer = await this.exportBOMToExcel({ 
      projectId, 
      includeHierarchy: true, 
      includeCustomFields: true 
    });
    
    // Copy BOM data to detail sheet (simplified approach)
    const bomWorkbook = new ExcelJS.Workbook();
    await bomWorkbook.xlsx.load(buffer);
    const bomWorksheet = bomWorkbook.getWorksheet(1);
    
    if (bomWorksheet) {
      bomWorksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
        const newRow = detailSheet.addRow(row.values as any[]);
        if (rowNumber === 1) {
          newRow.font = { bold: true };
        }
      });
    }

    const reportBuffer = await workbook.xlsx.writeBuffer();
    return reportBuffer;
  }

  async generateImportTemplate(): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('BOM Import Template');

    // Define template columns
    const columns = [
      { header: 'Part Number *', key: 'partNumber', width: 20 },
      { header: 'Descrizione *', key: 'description', width: 40 },
      { header: 'Quantità *', key: 'quantity', width: 12 },
      { header: 'Tipo *', key: 'itemType', width: 15 },
      { header: 'Parent Part Number', key: 'parentPartNumber', width: 20 },
      { header: 'Costo Stimato', key: 'estimatedCost', width: 15 },
      { header: 'RFQ Status', key: 'rfqStatus', width: 15 },
      { header: 'Data RFQ', key: 'rfqDate', width: 15 },
      { header: 'MOQ', key: 'moq', width: 10 },
      { header: 'Data Consegna', key: 'expectedDelivery', width: 15 },
      { header: 'Obsoleto', key: 'obsolete', width: 10 },
      { header: 'Stato Evasione', key: 'procurementStatus', width: 15 }
    ];

    worksheet.columns = columns;

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add example data
    worksheet.addRow({
      partNumber: 'ASM-001',
      description: 'Assieme Principale',
      quantity: 1,
      itemType: 'Assembly',
      parentPartNumber: '',
      estimatedCost: 1500.00,
      rfqStatus: 'Inviata',
      rfqDate: new Date('2024-01-15'),
      moq: 1,
      expectedDelivery: new Date('2024-03-15'),
      obsolete: 'No',
      procurementStatus: 'In Corso'
    });

    worksheet.addRow({
      partNumber: 'SUB-001',
      description: 'Sottoassieme Testata',
      quantity: 1,
      itemType: 'Subassembly',
      parentPartNumber: 'ASM-001',
      estimatedCost: 800.00,
      rfqStatus: 'Ricevuta',
      moq: 1,
      expectedDelivery: new Date('2024-02-28'),
      obsolete: 'No',
      procurementStatus: 'Completato'
    });

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('Istruzioni');
    instructionsSheet.addRow(['ISTRUZIONI PER L\'IMPORT']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['Campi Obbligatori (marcati con *):']);
    instructionsSheet.addRow(['- Part Number: Codice univoco del componente']);
    instructionsSheet.addRow(['- Descrizione: Descrizione del componente']);
    instructionsSheet.addRow(['- Quantità: Numero intero positivo']);
    instructionsSheet.addRow(['- Tipo: Assembly, Subassembly, o Part']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['Valori Validi per Tipo:']);
    instructionsSheet.addRow(['- Assembly, Assieme, ASM']);
    instructionsSheet.addRow(['- Subassembly, Sottoassieme, SUB']);
    instructionsSheet.addRow(['- Part, Parte, PRT']);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(['Valori Validi per Stato Evasione:']);
    instructionsSheet.addRow(['- Pending, In Attesa']);
    instructionsSheet.addRow(['- In Progress, In Corso']);
    instructionsSheet.addRow(['- Completed, Completato']);
    instructionsSheet.addRow(['- Delayed, In Ritardo']);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  validateColumnMapping(mapping: ColumnMapping): boolean {
    const requiredFields = ['partNumber', 'description', 'quantity', 'itemType'];
    const mappedFields = Object.values(mapping);
    
    return requiredFields.every(field => mappedFields.includes(field));
  }

  private buildColumnMap(headerRow: ExcelJS.Row, mapping: ColumnMapping): Map<number, string> {
    const columnMap = new Map<number, string>();
    
    headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      const headerValue = cell.value?.toString().trim();
      if (headerValue && mapping[headerValue]) {
        columnMap.set(colNumber, mapping[headerValue]);
      }
    });

    return columnMap;
  }

  private parseRowToBOMItem(row: ExcelJS.Row, columnMap: Map<number, string>, projectId: string): CreateBOMItemDto {
    const bomItem: any = { projectId };

    row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      const fieldName = columnMap.get(colNumber);
      if (fieldName && cell.value !== null && cell.value !== undefined) {
        let value = cell.value;

        // Type conversions
        switch (fieldName) {
          case 'quantity':
          case 'moq':
            bomItem[fieldName] = parseInt(value.toString());
            break;
          case 'estimatedCost':
          case 'actualCost':
            bomItem[fieldName] = parseFloat(value.toString());
            break;
          case 'obsolete':
            bomItem[fieldName] = this.parseBoolean(value.toString());
            break;
          case 'itemType':
            bomItem[fieldName] = this.mapItemType(value.toString());
            break;
          case 'procurementStatus':
            bomItem[fieldName] = this.mapProcurementStatus(value.toString());
            break;
          case 'rfqDate':
          case 'expectedDelivery':
          case 'receivedDate':
            bomItem[fieldName] = this.parseDate(value);
            break;
          default:
            bomItem[fieldName] = value.toString().trim();
        }
      }
    });

    return bomItem as CreateBOMItemDto;
  }

  private async validateBOMItemData(data: CreateBOMItemDto): Promise<void> {
    // Basic validation
    if (!data.partNumber || !data.description || !data.quantity || !data.itemType) {
      throw new Error('Missing required fields: partNumber, description, quantity, itemType');
    }

    if (data.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (!['assembly', 'subassembly', 'part'].includes(data.itemType)) {
      throw new Error('Invalid item type');
    }
  }

  private getRowData(row: ExcelJS.Row, columnMap: Map<number, string>): any {
    const data: any = {};
    row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      const fieldName = columnMap.get(colNumber);
      if (fieldName) {
        data[fieldName] = cell.value;
      }
    });
    return data;
  }

  private mapItemType(value: string): string {
    const normalized = value.trim();
    return ITEM_TYPE_MAPPING[normalized as keyof typeof ITEM_TYPE_MAPPING] || 'part';
  }

  private mapProcurementStatus(value: string): string {
    const normalized = value.trim();
    return PROCUREMENT_STATUS_MAPPING[normalized as keyof typeof PROCUREMENT_STATUS_MAPPING] || 'pending';
  }

  private mapItemTypeToDisplay(type: string): string {
    const mapping = {
      assembly: 'Assieme',
      subassembly: 'Sottoassieme',
      part: 'Parte'
    };
    return mapping[type as keyof typeof mapping] || type;
  }

  private mapProcurementStatusToDisplay(status: string): string {
    const mapping = {
      pending: 'In Attesa',
      in_progress: 'In Corso',
      completed: 'Completato',
      delayed: 'In Ritardo'
    };
    return mapping[status as keyof typeof mapping] || status;
  }

  private parseBoolean(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    return ['true', '1', 'sì', 'si', 'yes', 'y'].includes(normalized);
  }

  private parseDate(value: any): Date | undefined {
    if (!value) return undefined;
    
    if (value instanceof Date) return value;
    
    const parsed = new Date(value.toString());
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private async addCustomFieldsToExport(worksheet: ExcelJS.Worksheet, bomItems: BOMItem[]): Promise<void> {
    // Get all unique custom field names
    const customFieldNames = new Set<string>();
    bomItems.forEach(item => {
      item.customFields?.forEach(field => {
        customFieldNames.add(field.fieldName);
      });
    });

    // Add custom field columns
    const customFieldArray = Array.from(customFieldNames);
    customFieldArray.forEach(fieldName => {
      const newColumn = {
        header: `CF: ${fieldName}`,
        key: `cf_${fieldName}`,
        width: 20
      };
      // Add column manually since addColumn might not exist in all versions
      const columnIndex = worksheet.columns.length + 1;
      worksheet.getColumn(columnIndex).header = newColumn.header;
      worksheet.getColumn(columnIndex).key = newColumn.key;
      worksheet.getColumn(columnIndex).width = newColumn.width;
    });

    // Update rows with custom field data
    bomItems.forEach((item, index) => {
      const row = worksheet.getRow(index + 2); // +2 because of header and 1-based indexing
      
      customFieldArray.forEach(fieldName => {
        const customField = item.customFields?.find(cf => cf.fieldName === fieldName);
        if (customField) {
          row.getCell(`cf_${fieldName}`).value = customField.fieldValue;
        }
      });
    });
  }
}