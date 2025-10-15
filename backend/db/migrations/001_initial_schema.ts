import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE purchase_order_status AS ENUM (
      'PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'
    )
  `);

  await knex.schema.createTable('suppliers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('phone', 50).notNullable();
    table.text('address').notNullable();
    table.timestamps(true, true);
    
    table.index('email');
    table.index('name');
  });

  await knex.schema.createTable('warehouses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('location', 255).notNullable();
    table.integer('capacity').notNullable().checkPositive();
    table.integer('current_stock').defaultTo(0).unsigned();
    table.timestamps(true, true);

    table.index('name');
    table.check('?? <= ??', ['current_stock', 'capacity'], 'check_stock_capacity');
  });

  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('sku', 100).unique().notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.integer('reorder_threshold').notNullable().unsigned();
    table.integer('reorder_quantity').defaultTo(100).unsigned();
    table.uuid('supplier_id').notNullable()
      .references('id').inTable('suppliers').onDelete('RESTRICT');
    table.timestamps(true, true);
    
    table.index('sku');
    table.index('supplier_id');
    table.index('name');
  });

  // Product stocks table (inventory per warehouse)
  await knex.schema.createTable('product_stocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('product_id').notNullable()
      .references('id').inTable('products').onDelete('CASCADE');
    table.uuid('warehouse_id').notNullable()
      .references('id').inTable('warehouses').onDelete('CASCADE');
    table.integer('quantity').defaultTo(0).unsigned();
    table.timestamp('last_restocked');
    table.timestamps(true, true);
    
    table.unique(['product_id', 'warehouse_id']);
    table.index(['product_id', 'warehouse_id']);
  });

  // Create sequence for order numbers
  await knex.raw('CREATE SEQUENCE order_seq START 1000');

  await knex.schema.createTable('purchase_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('order_number', 100).unique().notNullable()
      .defaultTo(knex.raw("'PO-' || LPAD(nextval('order_seq')::text, 8, '0')"));
    table.uuid('product_id').notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.uuid('supplier_id').notNullable()
      .references('id').inTable('suppliers').onDelete('RESTRICT');
    table.uuid('warehouse_id').notNullable()
      .references('id').inTable('warehouses').onDelete('RESTRICT');
    table.integer('quantity_ordered').notNullable().unsigned();
    table.timestamp('order_date').defaultTo(knex.fn.now());
    table.timestamp('expected_arrival').notNullable();
    table.timestamp('actual_arrival');
    table.specificType('status', 'purchase_order_status').defaultTo('PENDING');
    table.text('notes');
    table.timestamps(true, true);
    
    table.index('status');
    table.index('order_number');
    table.index(['product_id', 'warehouse_id']);
    table.index('order_date');
  });

  // Stock adjustments table (audit trail)
  await knex.schema.createTable('stock_adjustments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('product_id').notNullable()
      .references('id').inTable('products').onDelete('CASCADE');
    table.uuid('warehouse_id').notNullable()
      .references('id').inTable('warehouses').onDelete('CASCADE');
    table.integer('adjustment').notNullable();
    table.string('reason', 255);
    table.string('user_id', 100).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['product_id', 'warehouse_id']);
    table.index('created_at');
  });

  // Create views for common queries
  await knex.raw(`
    CREATE VIEW low_stock_alerts AS
    SELECT 
      p.id,
      p.sku,
      p.name as product_name,
      p.reorder_threshold,
      ps.quantity as current_stock,
      w.name as warehouse_name,
      s.name as supplier_name,
      s.email as supplier_email
    FROM products p
    JOIN product_stocks ps ON p.id = ps.product_id
    JOIN warehouses w ON ps.warehouse_id = w.id
    JOIN suppliers s ON p.supplier_id = s.id
    WHERE ps.quantity < p.reorder_threshold
    ORDER BY ps.quantity ASC
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS low_stock_alerts');
  await knex.schema.dropTableIfExists('stock_adjustments');
  await knex.schema.dropTableIfExists('purchase_orders');
  await knex.raw('DROP SEQUENCE IF EXISTS order_seq');
  await knex.schema.dropTableIfExists('product_stocks');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('warehouses');
  await knex.schema.dropTableIfExists('suppliers');
  await knex.raw('DROP TYPE IF EXISTS purchase_order_status');
}
