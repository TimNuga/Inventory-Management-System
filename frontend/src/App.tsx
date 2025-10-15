
import React, { useState, useEffect } from 'react';
import {
  Package, ShoppingCart, AlertCircle, CheckCircle,
  RefreshCw, Warehouse, Plus, Minus, Truck, User
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  reorder_threshold: number;
  total_stock: number;
  stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  supplier_name: string;
  warehouse_stocks?: Array<{
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
    last_restocked: string;
  }>;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  product_name: string;
  supplier_name: string;
  warehouse_name: string;
  quantity_ordered: number;
  order_date: string;
  expected_arrival: string;
  actual_arrival?: string;
  status: string;
}

interface WarehouseData {
  id: string;
  name: string;
  location: string;
  capacity: number;
  current_stock: number;
  utilization_percentage: number;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  product_count: number;
  created_at: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'warehouses' | 'suppliers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stockModal, setStockModal] = useState<{
    product: Product;
    warehouseId: string;
    warehouseName: string;
    currentStock: number;
  } | null>(null);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const [orderModal, setOrderModal] = useState<boolean>(false);
  const [newOrder, setNewOrder] = useState({
    productId: '',
    warehouseId: '',
    quantity: 0
  });

  // Detail views
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [warehouseDetails, setWarehouseDetails] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsRes, ordersRes, warehousesRes, suppliersRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/purchase-orders`),
        fetch(`${API_BASE}/warehouses`),
        fetch(`${API_BASE}/suppliers`)
      ]);

      if (!productsRes.ok || !ordersRes.ok || !warehousesRes.ok || !suppliersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      const warehousesData = await warehousesRes.json();
      const suppliersData = await suppliersRes.json();

      setProducts(productsData.data || []);
      setOrders(ordersData.data || []);
      setWarehouses(warehousesData.data || []);
      setSuppliers(suppliersData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const adjustStock = async () => {
    if (!stockModal || adjustment === 0) return;

    try {
      const response = await fetch(`${API_BASE}/products/${stockModal.product.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: stockModal.warehouseId,
          adjustment: adjustment,
          reason: adjustmentReason || undefined
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || 'Failed to adjust stock');
        return;
      }

      await fetchData();
      setStockModal(null);
      setAdjustment(0);
      setAdjustmentReason('');
    } catch (err) {
      alert('Failed to adjust stock');
    }
  };

  const createOrder = async () => {
    if (!newOrder.productId || !newOrder.warehouseId || newOrder.quantity <= 0) {
      alert('Please fill all fields');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || 'Failed to create order');
        return;
      }

      await fetchData();
      setOrderModal(false);
      setNewOrder({ productId: '', warehouseId: '', quantity: 0 });
    } catch (err) {
      alert('Failed to create order');
    }
  };

  const completeOrder = async (orderId: string) => {
    if (!confirm('Complete this order and add stock to inventory?')) return;

    try {
      const response = await fetch(`${API_BASE}/purchase-orders/${orderId}/complete`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to complete order');
        return;
      }

      await fetchData();
    } catch (err) {
      alert('Failed to complete order');
    }
  };

  const fetchWarehouseDetails = async (warehouseId: string) => {
    try {
      const response = await fetch(`${API_BASE}/warehouses/${warehouseId}`);
      if (!response.ok) throw new Error('Failed to fetch warehouse details');

      const data = await response.json();
      setWarehouseDetails(data.data);
      setSelectedWarehouse(warehouseId);
    } catch (err) {
      alert('Failed to load warehouse details');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'LOW_STOCK':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'OUT_OF_STOCK':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'SHIPPED': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Warehouse className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management System</h1>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh data"
              className={`p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 ${
                refreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="flex gap-8">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Products
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Purchase Orders
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('warehouses')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'warehouses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4" />
                Warehouses
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suppliers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Suppliers
              </div>
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div
                          onClick={() => setSelectedProduct(product)}
                          className="cursor-pointer hover:text-blue-600"
                        >
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-gray-500">{product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {product.supplier_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          product.total_stock === 0 ? 'text-red-600' :
                          product.total_stock < product.reorder_threshold ? 'text-yellow-600' :
                          'text-gray-900'
                        }`}>
                          {product.total_stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {product.reorder_threshold}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(product.stock_status)}
                          <span className={`text-sm ${
                            product.stock_status === 'IN_STOCK' ? 'text-green-600' :
                            product.stock_status === 'LOW_STOCK' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {product.stock_status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {product.warehouse_stocks?.map((stock) => (
                          <div key={stock.warehouse_id} className="mb-1">
                            <span className="font-medium">{stock.warehouse_name}:</span>
                            <span className="ml-1">{stock.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setStockModal({
                                product,
                                warehouseId: stock.warehouse_id,
                                warehouseName: stock.warehouse_name,
                                currentStock: stock.quantity
                              })}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              adjust
                            </button>
                          </div>
                        ))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setNewOrder({ ...newOrder, productId: product.id });
                            setOrderModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Create Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOrderModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                New Purchase Order
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {order.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {order.warehouse_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                          {order.quantity_ordered}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(order.order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(order.expected_arrival).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {order.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => completeOrder(order.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Warehouses Tab */}
        {activeTab === 'warehouses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                onClick={() => fetchWarehouseDetails(warehouse.id)}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{warehouse.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{warehouse.location}</p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Capacity</span>
                      <span className="font-medium">{warehouse.capacity} units</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Current Stock</span>
                      <span className="font-medium">{warehouse.current_stock} units</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Utilization</span>
                      <span className="font-medium">{warehouse.utilization_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUtilizationColor(warehouse.utilization_percentage)}`}
                        style={{ width: `${warehouse.utilization_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a href={`mailto:${supplier.email}`} className="text-sm text-blue-600 hover:text-blue-800">
                          {supplier.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {supplier.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                        {supplier.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {supplier.product_count} {supplier.product_count === 1 ? 'product' : 'products'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(supplier.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Stock Adjustment Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Adjust Stock Level</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Product</p>
                <p className="font-medium">{stockModal.product.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Warehouse</p>
                <p className="font-medium">{stockModal.warehouseName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Current Stock</p>
                <p className="font-medium">{stockModal.currentStock} units</p>
              </div>
              
              <div>
                <label htmlFor="stock-adjustment" className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment (+/- quantity)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustment(adjustment - 1)}
                    aria-label="Decrease adjustment"
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id="stock-adjustment"
                    type="number"
                    value={adjustment}
                    onChange={(e) => setAdjustment(Number(e.target.value))}
                    aria-label="Stock adjustment quantity"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustment(adjustment + 1)}
                    aria-label="Increase adjustment"
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="adjustment-reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <input
                  id="adjustment-reason"
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Sales, Damage, Return"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {adjustment !== 0 && (
                <div className={`p-3 rounded-lg ${
                  adjustment > 0 ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
                }`}>
                  <p className="text-sm">
                    New stock level: <span className="font-medium">{stockModal.currentStock + adjustment}</span> units
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={adjustStock}
                  disabled={adjustment === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockModal(null);
                    setAdjustment(0);
                    setAdjustmentReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create Purchase Order</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="order-product" className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  id="order-product"
                  value={newOrder.productId}
                  onChange={(e) => setNewOrder({ ...newOrder, productId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="order-warehouse" className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse
                </label>
                <select
                  id="order-warehouse"
                  value={newOrder.warehouseId}
                  onChange={(e) => setNewOrder({ ...newOrder, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="order-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  id="order-quantity"
                  type="number"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={createOrder}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderModal(false);
                    setNewOrder({ productId: '', warehouseId: '', quantity: 0 });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Detail Modal */}
      {selectedWarehouse && warehouseDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-semibold">{warehouseDetails.name}</h3>
                <p className="text-gray-600">{warehouseDetails.location}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedWarehouse(null);
                  setWarehouseDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Capacity</p>
                <p className="text-2xl font-semibold">{warehouseDetails.capacity}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Current Stock</p>
                <p className="text-2xl font-semibold">{warehouseDetails.current_stock}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Utilization</p>
                <p className="text-2xl font-semibold">{warehouseDetails.utilization}%</p>
              </div>
            </div>

            <h4 className="font-semibold text-lg mb-3">Inventory</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warehouseDetails.inventory?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{item.sku}</td>
                      <td className="px-4 py-3 text-sm font-medium">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.supplier_name}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.reorder_threshold}</td>
                      <td className="px-4 py-3 text-sm">
                        {item.quantity < item.reorder_threshold ? (
                          <span className="text-yellow-600">Low Stock</span>
                        ) : (
                          <span className="text-green-600">In Stock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-semibold">{selectedProduct.name}</h3>
                <p className="text-gray-600 font-mono">{selectedProduct.sku}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedProduct.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-gray-900">{selectedProduct.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Stock</p>
                  <p className="text-2xl font-semibold">{selectedProduct.total_stock}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Reorder Threshold</p>
                  <p className="text-2xl font-semibold">{selectedProduct.reorder_threshold}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Supplier</p>
                <p className="text-gray-900">{selectedProduct.supplier_name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Stock by Warehouse</p>
                <div className="space-y-2">
                  {selectedProduct.warehouse_stocks?.map((stock) => (
                    <div key={stock.warehouse_id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <span className="font-medium">{stock.warehouse_name}</span>
                      <span className="text-lg font-semibold">{stock.quantity} units</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedProduct.stock_status)}
                  <span className={`font-medium ${
                    selectedProduct.stock_status === 'IN_STOCK' ? 'text-green-600' :
                    selectedProduct.stock_status === 'LOW_STOCK' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedProduct.stock_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
