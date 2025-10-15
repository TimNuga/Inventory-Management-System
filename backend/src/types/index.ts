export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  current_stock: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  reorder_threshold: number;
  reorder_quantity: number;
  supplier_id: string;
  supplier_name?: string;
  total_stock?: number;
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  created_at?: Date;
  updated_at?: Date;
}

export interface ProductStock {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  last_restocked?: Date;
  warehouse_name?: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  product_id: string;
  supplier_id: string;
  warehouse_id: string;
  quantity_ordered: number;
  order_date: Date;
  expected_arrival: Date;
  actual_arrival?: Date;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  product_name?: string;
  supplier_name?: string;
  warehouse_name?: string;
}

export interface StockAdjustment {
  product_id: string;
  warehouse_id: string;
  adjustment: number;
  reason?: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}