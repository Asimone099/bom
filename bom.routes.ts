import { Router } from 'express';
import { BOMController } from '../controllers/bom.controller';

const router = Router();
const bomController = new BOMController();

// BOM Tree and Search Routes
router.get('/projects/:projectId/bom', bomController.getBOMTree);
router.get('/projects/:projectId/bom/search', bomController.searchBOM);
router.get('/projects/:projectId/bom/quantities', bomController.getTotalQuantities);
router.get('/projects/:projectId/bom/duplicates', bomController.getDuplicatePartNumbers);

// BOM Item CRUD Routes
router.post('/projects/:projectId/bom', bomController.createBOMItem);
router.get('/bom-items/:id', bomController.getBOMItem);
router.put('/bom-items/:id', bomController.updateBOMItem);
router.delete('/bom-items/:id', bomController.deleteBOMItem);

export default router;