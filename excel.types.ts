export interface ColumnMapping {
  [excelColumn: string]: string; // Excel column name -> BOM field name
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  errors: ImportError[];
  createdItems: string[]; // IDs of created items
}

export interface ImportError {
  row: number;
  column?: string;
  message: string;
  data?: any;
}

export interface ExcelImportOptions {
  projectId: string;
  mapping: ColumnMapping;
  skipFirstRow?: boolean;
  validateOnly?: boolean;
}

export interface ExcelExportOptions {
  projectId: string;
  includeHierarchy?: boolean;
  includeCustomFields?: boolean;
  filters?: any;
}

// Standard BOM field mappings
export const STANDARD_BOM_FIELDS = {
  partNumber: 'Part Number',
  description: 'Descrizione',
  quantity: 'Quantità',
  itemType: 'Tipo',
  estimatedCost: 'Costo Stimato',
  rfqStatus: 'RFQ Status',
  rfqDate: 'Data RFQ',
  moq: 'MOQ',
  expectedDelivery: 'Data Consegna',
  obsolete: 'Obsoleto',
  procurementStatus: 'Stato Evasione',
  actualCost: 'Costo Effettivo',
  receivedDate: 'Data Ricevimento'
};

export const ITEM_TYPE_MAPPING = {
  'Assieme': 'assembly',
  'Assembly': 'assembly',
  'ASM': 'assembly',
  'Sottoassieme': 'subassembly',
  'Subassembly': 'subassembly',
  'SUB': 'subassembly',
  'Parte': 'part',
  'Part': 'part',
  'PRT': 'part'
};

export const PROCUREMENT_STATUS_MAPPING = {
  'In Attesa': 'pending',
  'Pending': 'pending',
  'In Corso': 'in_progress',
  'In Progress': 'in_progress',
  'Completato': 'completed',
  'Completed': 'completed',
  'In Ritardo': 'delayed',
  'Delayed': 'delayed'
};