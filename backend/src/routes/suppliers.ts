import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Get all suppliers
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const suppliers = await db('suppliers as s')
    .leftJoin('products as p', 's.id', 'p.supplier_id')
    .select(
      's.*',
      db.raw('COUNT(DISTINCT p.id) as product_count')
    )
    .groupBy('s.id')
    .orderBy('s.name');

  res.json({ success: true, data: suppliers });
}));

export { router as supplierRoutes };
