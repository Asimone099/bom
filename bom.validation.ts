import { z } from 'zod';

export const createBOMItemSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  partNumber: z.string().min(1, 'Part Number è obbligatorio'),
  description: z.string().min(1, 'Descrizione è obbligatoria'),
  quantity: z.number().int().positive('Quantità deve essere positiva'),
  itemType: z.enum(['assembly', 'subassembly', 'part']),
  estimatedCost: z.number().positive().optional(),
  rfqStatus: z.string().optional(),
  rfqDate: z.string().datetime().optional(),
  moq: z.number().int().positive().optional(),
  expectedDelivery: z.string().datetime().optional(),
  obsolete: z.boolean().default(false),
  procurementStatus: z.enum(['pending', 'in_progress', 'completed', 'delayed']).default('pending'),
  actualCost: z.number().positive().optional(),
  receivedDate: z.string().datetime().optional()
});

export const updateBOMItemSchema = z.object({
  partNumber: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  itemType: z.enum(['assembly', 'subassembly', 'part']).optional(),
  estimatedCost: z.number().positive().optional(),
  rfqStatus: z.string().optional(),
  rfqDate: z.string().datetime().optional(),
  moq: z.number().int().positive().optional(),
  expectedDelivery: z.string().datetime().optional(),
  obsolete: z.boolean().optional(),
  procurementStatus: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional(),
  actualCost: z.number().positive().optional(),
  receivedDate: z.string().datetime().optional()
});

export const bomFilterSchema = z.object({
  itemType: z.enum(['assembly', 'subassembly', 'part']).optional(),
  procurementStatus: z.enum(['pending', 'in_progress', 'completed', 'delayed']).optional(),
  obsolete: z.boolean().optional(),
  partNumber: z.string().optional(),
  description: z.string().optional(),
  minCost: z.number().positive().optional(),
  maxCost: z.number().positive().optional(),
  rfqStatus: z.string().optional(),
  expectedDeliveryFrom: z.string().datetime().optional(),
  expectedDeliveryTo: z.string().datetime().optional()
});

export type CreateBOMItemInput = z.infer<typeof createBOMItemSchema>;
export type UpdateBOMItemInput = z.infer<typeof updateBOMItemSchema>;
export type BOMFilterInput = z.infer<typeof bomFilterSchema>;