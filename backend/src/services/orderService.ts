import { db } from '../config/database';
import { AppError, PurchaseOrder } from '../types';
import { InventoryService } from './inventoryService';

export class OrderService {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  async createOrder(
    productId: string,
    warehouseId: string,
    quantity: number,
    supplierId?: string
  ): Promise<PurchaseOrder> {
    return await db.transaction(async (trx) => {
      const product = await trx('products')
        .where('id', productId)
        .first();

      if (!product) {
        throw new AppError(404, 'Product not found');
      }

      const warehouse = await trx('warehouses')
        .where('id', warehouseId)
        .first();

      if (!warehouse) {
        throw new AppError(404, 'Warehouse not found');
      }

      const pendingOrders = await trx('purchase_orders')
        .where('product_id', productId)
        .where('warehouse_id', warehouseId)
        .whereIn('status', ['PENDING', 'CONFIRMED', 'SHIPPED'])
        .select('quantity_ordered');

      const pendingQuantity = pendingOrders.reduce(
        (sum, order) => sum + order.quantity_ordered,
        0
      );

      const availableCapacity = warehouse.capacity - warehouse.current_stock - pendingQuantity;

      if (availableCapacity <= 0) {
        throw new AppError(
          400,
          `Warehouse at capacity. No space available (pending orders: ${pendingQuantity} units)`
        );
      }

      const orderQuantity = Math.min(quantity, availableCapacity);

      const [order] = await trx('purchase_orders')
        .insert({
          product_id: productId,
          supplier_id: supplierId || product.supplier_id,
          warehouse_id: warehouseId,
          quantity_ordered: orderQuantity,
          expected_arrival: trx.raw("CURRENT_DATE + INTERVAL '3 days'"),
          status: 'PENDING'
        })
        .returning('*');

      return order;
    });
  }

  async completeOrder(orderId: string): Promise<{ success: boolean }> {
    return await db.transaction(async (trx) => {
      const order = await trx('purchase_orders')
        .where('id', orderId)
        .forUpdate()
        .first();

      if (!order) {
        throw new AppError(404, 'Order not found');
      }

      if (order.status === 'COMPLETED') {
        throw new AppError(400, 'Order already completed');
      }

      if (order.status === 'CANCELLED') {
        throw new AppError(400, 'Cannot complete cancelled order');
      }

      await trx('purchase_orders')
        .where('id', orderId)
        .update({
          status: 'COMPLETED',
          actual_arrival: trx.fn.now(),
          updated_at: trx.fn.now()
        });

      // Add stock to inventory using the inventory service
      // Note: We're using the service method but within our transaction
      await this.inventoryService.adjustStock(
        order.product_id,
        order.warehouse_id,
        order.quantity_ordered,
        `Purchase order ${order.order_number} completed`
      );

      return { success: true };
    });
  }

  async getAllOrders(filters?: {
    status?: string;
    productId?: string;
    warehouseId?: string;
  }): Promise<PurchaseOrder[]> {
    let query = db('purchase_orders as po')
      .join('products as p', 'po.product_id', 'p.id')
      .join('suppliers as s', 'po.supplier_id', 's.id')
      .join('warehouses as w', 'po.warehouse_id', 'w.id')
      .select(
        'po.*',
        'p.name as product_name',
        'p.sku as product_sku',
        's.name as supplier_name',
        's.email as supplier_email',
        'w.name as warehouse_name',
        'w.location as warehouse_location'
      );

    if (filters?.status) {
      query = query.where('po.status', filters.status);
    }
    if (filters?.productId) {
      query = query.where('po.product_id', filters.productId);
    }
    if (filters?.warehouseId) {
      query = query.where('po.warehouse_id', filters.warehouseId);
    }

    return await query.orderBy('po.order_date', 'desc');
  }
}
