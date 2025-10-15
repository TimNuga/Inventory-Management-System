import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('stock_adjustments').del();
  await knex('purchase_orders').del();
  await knex('product_stocks').del();
  await knex('products').del();
  await knex('warehouses').del();
  await knex('suppliers').del();

  const suppliers = await knex('suppliers').insert([
    {
      name: 'TechSupply Co.',
      email: 'orders@techsupply.com',
      phone: '+1-555-0100',
      address: '123 Tech Street, Silicon Valley, CA 94000'
    },
    {
      name: 'Global Electronics',
      email: 'sales@globalelec.com',
      phone: '+1-555-0200',
      address: '456 Circuit Ave, Austin, TX 78701'
    },
    {
      name: 'Digital Warehouse',
      email: 'contact@digitalwh.com',
      phone: '+1-555-0300',
      address: '789 Data Drive, Seattle, WA 98101'
    }
  ]).returning('*');

  const warehouses = await knex('warehouses').insert([
    {
      name: 'Main Distribution Center',
      location: 'New York, NY',
      capacity: 10000,
      current_stock: 0
    },
    {
      name: 'West Coast Hub',
      location: 'Los Angeles, CA',
      capacity: 7500,
      current_stock: 0
    },
    {
      name: 'Central Warehouse',
      location: 'Chicago, IL',
      capacity: 5000,
      current_stock: 0
    }
  ]).returning('*');

  const products = await knex('products').insert([
    {
      sku: 'LAPTOP-001',
      name: 'Professional Laptop',
      description: 'High-performance laptop for business use',
      reorder_threshold: 20,
      reorder_quantity: 50,
      supplier_id: suppliers[0].id
    },
    {
      sku: 'MOUSE-002',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with precision tracking',
      reorder_threshold: 50,
      reorder_quantity: 100,
      supplier_id: suppliers[1].id
    },
    {
      sku: 'KEYB-003',
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches',
      reorder_threshold: 30,
      reorder_quantity: 75,
      supplier_id: suppliers[1].id
    },
    {
      sku: 'MONITOR-004',
      name: '27" 4K Monitor',
      description: 'Professional 4K IPS display with HDR',
      reorder_threshold: 15,
      reorder_quantity: 40,
      supplier_id: suppliers[2].id
    },
    {
      sku: 'WEBCAM-005',
      name: 'HD Webcam',
      description: '1080p webcam with autofocus',
      reorder_threshold: 40,
      reorder_quantity: 80,
      supplier_id: suppliers[0].id
    }
  ]).returning('*');

  // Create initial stock for each product in each warehouse
  const stockEntries = [];
  let totalStockByWarehouse: { [key: string]: number } = {};

  for (const product of products) {
    for (const warehouse of warehouses) {
      // Random initial stock between 10 and 100
      const quantity = Math.floor(Math.random() * 90) + 10;
      
      stockEntries.push({
        product_id: product.id,
        warehouse_id: warehouse.id,
        quantity: quantity,
        last_restocked: knex.fn.now()
      });

      totalStockByWarehouse[warehouse.id] = 
        (totalStockByWarehouse[warehouse.id] || 0) + quantity;
    }
  }

  await knex('product_stocks').insert(stockEntries);

  for (const warehouseId in totalStockByWarehouse) {
    await knex('warehouses')
      .where('id', warehouseId)
      .update({ current_stock: totalStockByWarehouse[warehouseId] });
  }

  console.log('Database seeded successfully');
}
