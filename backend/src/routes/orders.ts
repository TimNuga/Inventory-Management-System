import { Router, Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../types';

const router = Router();
const orderService = new OrderService();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, productId, warehouseId } = req.query;

  const orders = await orderService.getAllOrders({
    status: status as string,
    productId: productId as string,
    warehouseId: warehouseId as string
  });

  res.json({ success: true, data: orders });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { productId, warehouseId, quantity, supplierId } = req.body;

  if (!productId || !warehouseId || !quantity) {
    throw new AppError(400, 'productId, warehouseId, and quantity are required');
  }

  const order = await orderService.createOrder(
    productId,
    warehouseId,
    quantity,
    supplierId
  );

  res.status(201).json({ success: true, data: order });
}));

router.patch('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.completeOrder(req.params.id);
  res.json({ success: true, data: result });
}));

export { router as orderRoutes };
