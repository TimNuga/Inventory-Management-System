import { db } from '../config/database';
import { AppError } from '../types';
import { Knex } from 'knex';

export class InventoryService {
  async adjustStock(
    productId: string,
    warehouseId: string,
    adjustment: number,
    reason?: string
  ): Promise<{ success: boolean; newQuantity: number }> {
    return await db.transaction(async (trx: Knex.Transaction) => {
      // Lock row to prevent race conditions
      const stock = await trx('product_stocks as ps')
        .join('warehouses as w', 'ps.warehouse_id', 'w.id')
        .join('products as p', 'ps.product_id', 'p.id')
        .where('ps.product_id', productId)
        .where('ps.warehouse_id', warehouseId)
        .select(
          'ps.*',
          'w.capacity',
          'w.current_stock',
          'p.reorder_threshold',
          'p.reorder_quantity'
        )
        .forUpdate()
        .first();

      if (!stock) {
        throw new AppError(404, 'Product not found in specified warehouse');
      }

      const newQuantity = stock.quantity + adjustment;

      if (newQuantity < 0) {
        throw new AppError(
          400,
          `Insufficient stock. Available: ${stock.quantity}, Requested: ${Math.abs(adjustment)}`
        );
      }

      const otherProductsStock = await trx('product_stocks')
        .where('warehouse_id', warehouseId)
        .whereNot('product_id', productId)
        .sum('quantity as total')
        .first();

      const otherTotal = Number(otherProductsStock?.total || 0);
      const newWarehouseTotal = otherTotal + newQuantity;

      if (newWarehouseTotal > stock.capacity) {
        const availableSpace = stock.capacity - otherTotal;
        throw new AppError(
          400,
          `Warehouse capacity exceeded. Available space: ${availableSpace}, Requested: ${adjustment > 0 ? adjustment : 0 - adjustment}`
        );
      }

      await trx('product_stocks')
        .where({ product_id: productId, warehouse_id: warehouseId })
        .update({
          quantity: newQuantity,
          last_restocked: adjustment > 0 ? trx.fn.now() : stock.last_restocked,
          updated_at: trx.fn.now()
        });

      await trx('warehouses')
        .where('id', warehouseId)
        .update({
          current_stock: newWarehouseTotal,
          updated_at: trx.fn.now()
        });

      await trx('stock_adjustments').insert({
        product_id: productId,
        warehouse_id: warehouseId,
        adjustment: adjustment,
        reason: reason || (adjustment > 0 ? 'Stock received' : 'Stock consumed'),
        user_id: 'system', // In production, would come from auth
        created_at: trx.fn.now()
      });

      return { success: true, newQuantity };
    });
  }

  async getProductsWithStock() {
    const products = await db
      .with('stock_summary', (qb) => {
        qb.select('product_id')
          .sum('quantity as total_stock')
          .from('product_stocks')
          .groupBy('product_id');
      })
      .select(
        'p.*',
        's.name as supplier_name',
        db.raw('COALESCE(ss.total_stock, 0) as total_stock'),
        db.raw(`
          CASE 
            WHEN COALESCE(ss.total_stock, 0) = 0 THEN 'OUT_OF_STOCK'
            WHEN COALESCE(ss.total_stock, 0) < p.reorder_threshold THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
          END as stock_status
        `)
      )
      .from('products as p')
      .leftJoin('suppliers as s', 'p.supplier_id', 's.id')
      .leftJoin('stock_summary as ss', 'p.id', 'ss.product_id')
      .orderBy('p.name');

    const productIds = products.map(p => p.id);
    
    if (productIds.length > 0) {
      const stockDetails = await db.raw(`
        SELECT 
          p.id as product_id,
          COALESCE(
            json_agg(
              json_build_object(
                'warehouse_id', w.id,
                'warehouse_name', w.name,
                'warehouse_location', w.location,
                'quantity', ps.quantity,
                'last_restocked', ps.last_restocked
              ) ORDER BY w.name
            ) FILTER (WHERE w.id IS NOT NULL),
            '[]'::json
          ) as warehouse_stocks
        FROM products p
        LEFT JOIN product_stocks ps ON p.id = ps.product_id
        LEFT JOIN warehouses w ON ps.warehouse_id = w.id
        WHERE p.id = ANY(?)
        GROUP BY p.id
      `, [productIds]);

      const stockDetailsMap = new Map(
        stockDetails.rows.map((row: any) => [row.product_id, row.warehouse_stocks])
      );

      return products.map(product => ({
        ...product,
        warehouse_stocks: stockDetailsMap.get(product.id) || []
      }));
    }

    return products;
  }

  async getProductById(id: string) {
    const product = await db('products as p')
      .where('p.id', id)
      .leftJoin('suppliers as s', 'p.supplier_id', 's.id')
      .select('p.*', 's.name as supplier_name', 's.email as supplier_email')
      .first();

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    const stockLevels = await db('product_stocks as ps')
      .where('ps.product_id', id)
      .join('warehouses as w', 'ps.warehouse_id', 'w.id')
      .select(
        'ps.*',
        'w.name as warehouse_name',
        'w.location as warehouse_location',
        'w.capacity',
        'w.current_stock as warehouse_current_stock'
      );

    const totalStock = stockLevels.reduce((sum, stock) => sum + stock.quantity, 0);

    return {
      ...product,
      total_stock: totalStock,
      stock_status: this.getStockStatus(totalStock, product.reorder_threshold),
      stock_levels: stockLevels
    };
  }

  private getStockStatus(quantity: number, threshold: number): string {
    if (quantity === 0) return 'OUT_OF_STOCK';
    if (quantity < threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }
}
