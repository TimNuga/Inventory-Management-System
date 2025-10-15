import { db } from '../config/database';

export class ReorderMonitor {
  private interval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Starts the automatic reorder monitoring process
   * In production, this would be a separate microservice or use a job queue like Bull
   */
  start() {
    if (this.isRunning) return;

    console.log('Starting automatic reorder monitoring...');
    this.isRunning = true;

    // Check every minute (configurable in production)
    this.interval = setInterval(() => {
      this.checkReorderLevels().catch(console.error);
    }, 60000);

    // Run immediately on startup
    this.checkReorderLevels().catch(console.error);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      console.log('Stopped reorder monitoring');
    }
  }

  private async checkReorderLevels(): Promise<void> {
    const startTime = Date.now();

    try {
      await db.transaction(async (trx) => {
        const reorderNeeded = await trx.raw(`
          WITH low_stock AS (
            -- Find products below reorder threshold
            SELECT 
              ps.product_id,
              ps.warehouse_id,
              ps.quantity as current_quantity,
              p.reorder_threshold,
              p.reorder_quantity,
              p.supplier_id,
              p.name as product_name,
              w.name as warehouse_name,
              w.capacity,
              w.current_stock,
              (w.capacity - w.current_stock) as available_capacity
            FROM product_stocks ps
            INNER JOIN products p ON ps.product_id = p.id
            INNER JOIN warehouses w ON ps.warehouse_id = w.id
            WHERE ps.quantity < p.reorder_threshold
          ),
          pending_orders AS (
            -- Get quantities already on order
            SELECT 
              product_id,
              warehouse_id,
              SUM(quantity_ordered) as pending_quantity
            FROM purchase_orders
            WHERE status IN ('PENDING', 'CONFIRMED', 'SHIPPED')
            GROUP BY product_id, warehouse_id
          ),
          reorder_candidates AS (
            -- Calculate actual reorder needs
            SELECT 
              ls.*,
              COALESCE(po.pending_quantity, 0) as pending_quantity,
              -- Only reorder if current + pending is still below threshold
              CASE 
                WHEN (ls.current_quantity + COALESCE(po.pending_quantity, 0)) < ls.reorder_threshold 
                THEN true 
                ELSE false 
              END as needs_reorder,
              -- Calculate order quantity (considering available space)
              LEAST(
                ls.reorder_quantity,
                ls.available_capacity - COALESCE(po.pending_quantity, 0)
              ) as suggested_order_quantity
            FROM low_stock ls
            LEFT JOIN pending_orders po 
              ON ls.product_id = po.product_id 
              AND ls.warehouse_id = po.warehouse_id
          )
          SELECT * FROM reorder_candidates 
          WHERE needs_reorder = true 
            AND suggested_order_quantity > 0
          ORDER BY current_quantity ASC
        `);

        const itemsToReorder = reorderNeeded.rows;
        let ordersCreated = 0;

        for (const item of itemsToReorder) {
          try {
            const [order] = await trx('purchase_orders')
              .insert({
                product_id: item.product_id,
                supplier_id: item.supplier_id,
                warehouse_id: item.warehouse_id,
                quantity_ordered: item.suggested_order_quantity,
                expected_arrival: trx.raw("CURRENT_DATE + INTERVAL '3 days'"),
                status: 'PENDING',
                notes: `Automatic reorder: Stock at ${item.current_quantity}/${item.reorder_threshold}`
              })
              .returning('order_number');

            console.log(
              `📦 Auto-reorder created: ${order.order_number} - ${item.product_name} ` +
              `(${item.suggested_order_quantity} units) for ${item.warehouse_name}`
            );
            ordersCreated++;
          } catch (error) {
            console.error(`Failed to create reorder for product ${item.product_id}:`, error);
          }
        }

        if (ordersCreated > 0) {
          console.log(`Reorder check complete: ${ordersCreated} orders created in ${Date.now() - startTime}ms`);
        }
      });
    } catch (error) {
      console.error('Reorder monitor error:', error);
    }
  }
}
