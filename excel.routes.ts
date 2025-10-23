import { Router } from 'express';
import { ExcelController } from '../controllers/excel.controller';
import { uploadExcel, handleUploadError } from '../middleware/upload';

const router = Router();
const excelController = new ExcelController();

// Excel Import/Export Routes
router.post('/projects/:projectId/import-excel', uploadExcel, handleUploadError, excelController.importExcel);
router.post('/projects/:projectId/validate-excel', uploadExcel, handleUploadError, excelController.validateExcel);
router.get('/projects/:projectId/export-excel', excelController.exportExcel);
router.get('/projects/:projectId/export-kpi-report', excelController.exportKPIReport);

// Template and Utility Routes
router.get('/excel/import-template', excelController.downloadImportTemplate);
router.get('/excel/column-mappings', excelController.getStandardColumnMappings);

export default router;