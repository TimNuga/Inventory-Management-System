# Backend - Inventory Management System

A TypeScript-based REST API for managing inventory across multiple warehouses with automatic reordering capabilities.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

## Database Setup

First, create the database and user. Open `psql` as a superuser:

```bash
psql postgres
```

Run these commands:

```sql
CREATE DATABASE inventory_db;
CREATE USER inventory_user WITH PASSWORD 'inventory_pass';
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
\c inventory_db
GRANT ALL ON SCHEMA public TO inventory_user;
```

## Installation

```bash
npm install
```

## Configuration

The database connection is configured in `src/config/database.ts`. Default settings:

- Host: localhost
- Port: 5432
- Database: inventory_db
- User: inventory_user
- Password: inventory_pass

If you need different credentials, update the connection config in `database.ts`.

## Running Migrations

Migrations create the schema (products, warehouses, suppliers, product_stocks, purchase_orders):

```bash
npm run migrate
```

## Seeding Data

Populate the database with sample data (3 warehouses, 2 suppliers, 5 products, initial stock):

```bash
npm run seed
```

## Development

Start the server with hot reload:

```bash
npm run dev
```

The API runs on `http://localhost:3001`.

## Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Products
- `GET /api/products` - List all products with stock levels
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Warehouses
- `GET /api/warehouses` - List warehouses with utilization
- `GET /api/warehouses/:id` - Get warehouse details and inventory
- `POST /api/warehouses` - Create warehouse
- `PUT /api/warehouses/:id` - Update warehouse
- `DELETE /api/warehouses/:id` - Delete warehouse

### Suppliers
- `GET /api/suppliers` - List all suppliers
- `GET /api/suppliers/:id` - Get supplier details
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Purchase Orders
- `GET /api/purchase-orders` - List orders
- `GET /api/purchase-orders/:id` - Get order details
- `POST /api/purchase-orders` - Create order
- `PUT /api/purchase-orders/:id/receive` - Receive order (updates stock)
- `DELETE /api/purchase-orders/:id` - Cancel order

### Stock Management
- `POST /api/stock/adjust` - Adjust stock quantity
  - Validates warehouse capacity
  - Uses row-level locking to prevent race conditions
  - Body: `{ productId, warehouseId, quantity }`

## How Automatic Reordering Works

The system monitors stock levels every 60 seconds. When a product's total stock falls below its reorder threshold, it automatically creates a purchase order. The quantity ordered is calculated to bring stock back to a safe level (reorder threshold + 50% buffer).

The monitoring job runs in `src/jobs/inventoryMonitor.ts` and uses PostgreSQL CTEs to efficiently identify low-stock products and create orders in a single transaction.

## Project Structure

```
backend/
├── db/
│   ├── migrations/     # Database schema migrations
│   └── seeds/          # Sample data
├── src/
│   ├── config/         # Database connection
│   ├── jobs/           # Background jobs (reorder monitor)
│   ├── middleware/     # Express middleware (error handler)
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic (inventory service)
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Helper functions
│   └── server.ts       # Application entry point
├── knexfile.ts         # Knex migration configuration
└── tsconfig.json       # TypeScript configuration
```

## Key Features

- **Capacity Management**: Prevents overstocking warehouses
- **Automatic Reordering**: Background job monitors stock levels
- **Transaction Safety**: Row-level locking prevents concurrent modification issues
- **Type Safety**: Fully typed with TypeScript
- **Query Optimization**: Uses CTEs for complex queries instead of multiple round trips

## Troubleshooting

**Migration fails with "permission denied":**
Make sure you granted schema privileges:
```sql
\c inventory_db
GRANT ALL ON SCHEMA public TO inventory_user;
```

**Port 3001 already in use:**
```bash
lsof -ti:3001 | xargs kill -9
```

**Can't connect to PostgreSQL:**
Check if PostgreSQL is running:
```bash
pg_isready
```
