import { Router, Request, Response } from 'express';
import { InventoryService } from '../services/inventoryService';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../types';

const router = Router();
const inventoryService = new InventoryService();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const products = await inventoryService.getProductsWithStock();
  res.json({ success: true, data: products });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const product = await inventoryService.getProductById(req.params.id);
  res.json({ success: true, data: product });
}));

router.patch('/:id/stock', asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId, adjustment, reason } = req.body;

  if (!warehouseId || typeof adjustment !== 'number') {
    throw new AppError(400, 'warehouseId and numeric adjustment are required');
  }

  const result = await inventoryService.adjustStock(
    req.params.id,
    warehouseId,
    adjustment,
    reason
  );

  res.json({ success: true, data: result });
}));

export { router as productRoutes };
