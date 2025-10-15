import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const warehouses = await db('warehouses as w')
    .select(
      'w.*',
      db.raw('ROUND((w.current_stock::numeric / w.capacity) * 100, 2) as utilization_percentage')
    )
    .orderBy('w.name');

  res.json({ success: true, data: warehouses });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await db('warehouses')
    .where('id', req.params.id)
    .first();

  if (!warehouse) {
    return res.status(404).json({ success: false, error: 'Warehouse not found' });
  }

  const inventory = await db('product_stocks as ps')
    .where('ps.warehouse_id', req.params.id)
    .join('products as p', 'ps.product_id', 'p.id')
    .join('suppliers as s', 'p.supplier_id', 's.id')
    .select(
      'ps.*',
      'p.name as product_name',
      'p.sku',
      'p.reorder_threshold',
      's.name as supplier_name'
    )
    .where('ps.quantity', '>', 0)
    .orderBy('p.name');

  res.json({
    success: true,
    data: {
      ...warehouse,
      utilization: Math.round((warehouse.current_stock / warehouse.capacity) * 100),
      inventory
    }
  });
}));

export { router as warehouseRoutes };
