import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { productRoutes } from './routes/products';
import { orderRoutes } from './routes/orders';
import { warehouseRoutes } from './routes/warehouses';
import { supplierRoutes } from './routes/suppliers';
import { errorHandler } from './middleware/errorHandler';
import { ReorderMonitor } from './services/reorderMonitor';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/purchase-orders', orderRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/suppliers', supplierRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const reorderMonitor = new ReorderMonitor();
reorderMonitor.start();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Inventory monitoring active`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  reorderMonitor.stop();
  process.exit(0);
});