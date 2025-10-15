# Frontend - Inventory Management System

A React + TypeScript dashboard for managing inventory, warehouses, suppliers, and purchase orders.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on port 3001

## Installation

```bash
npm install
```

## Development

Start the dev server with hot reload:

```bash
npm run dev
```

The app runs on `http://localhost:3000` and proxies API requests to `http://localhost:3001`.

## Build for Production

```bash
npm run build
```

Build output goes to the `dist/` directory. Serve it with any static file server.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icon library

## Features

### Products Tab
- View all products with SKU, name, supplier, stock levels, and reorder thresholds
- Color-coded status indicators (In Stock, Low Stock, Out of Stock)
- Click product names to see detailed breakdowns by warehouse
- Adjust stock quantities with capacity validation
- Real-time stock updates

### Warehouses Tab
- View all warehouses with capacity, current stock, and utilization percentage
- Visual progress bars showing warehouse utilization
- Click warehouse cards to see detailed inventory for that location
- Shows SKU, product, supplier, quantity, and reorder levels for each item

### Orders Tab
- Track all purchase orders with status (PENDING, RECEIVED, CANCELLED)
- See order details: product, supplier, warehouse, quantity, costs
- Filter by status with color-coded badges
- Receive orders directly from the UI (updates stock automatically)

### Suppliers Tab
- View all suppliers with contact information
- Shows product count for each supplier
- Email, phone, and address details

## Component Structure

The entire app is in `App.tsx` (single-file component). Here's what's inside:

- **State Management**: React hooks for products, warehouses, orders, suppliers
- **Data Fetching**: Auto-refreshes every 30 seconds
- **Forms**: Product stock adjustment with validation
- **Modals**: Warehouse detail view, product detail view
- **Tabs**: Navigation between products, orders, warehouses, suppliers

## Styling Approach

Tailwind utility classes handle all styling. The design uses:
- Gray/white color scheme for backgrounds
- Status colors (green = good, yellow = warning, red = critical)
- Responsive grid layouts (mobile, tablet, desktop)
- Hover effects on interactive elements
- Shadow depths for cards and elevated components

## API Integration

All API calls go through `fetch()` to the backend. The Vite proxy configuration in `vite.config.ts` forwards `/api/*` requests to `http://localhost:3001`.

Example:
```typescript
const response = await fetch(`${API_BASE}/products`);
const data = await response.json();
```

## Accessibility

Forms follow WCAG 2.1 AA standards:
- All buttons have explicit `type` attributes
- Icon-only buttons have `aria-label` attributes
- Form inputs have associated labels via `htmlFor`/`id` pairs
- All interactive elements are keyboard-accessible

## Common Issues

**Port 3000 in use:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

**API calls failing:**
Make sure the backend is running on port 3001. Check the browser console for CORS or network errors.

**Styles not applying:**
If Tailwind classes aren't working, rebuild the CSS:
```bash
rm -rf node_modules/.vite
npm run dev
```

**TypeScript errors:**
```bash
npm run build
```
This shows all type errors. The dev server sometimes doesn't catch everything.

## Development Notes

- Stock adjustments validate against warehouse capacity before submitting
- The refresh button manually triggers data fetch (otherwise auto-refreshes every 30s)
- Status indicators update in real-time after stock adjustments
- Modals close when clicking the ✕ button (Escape key not implemented)
- No state management library needed - React's `useState` handles everything

## File Structure

```
frontend/
├── public/             # Static assets
├── src/
│   ├── App.tsx         # Main application component
│   ├── index.tsx       # React entry point
│   └── index.css       # Tailwind directives
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration (proxy setup)
├── tailwind.config.js  # Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## Customization

**Change API URL:**
Update `API_BASE` in `App.tsx` or modify the proxy in `vite.config.ts`.

**Adjust refresh interval:**
Change the `30000` (30 seconds) in the `setInterval` call inside `App.tsx`.

**Add new tabs:**
1. Add tab name to the `activeTab` type
2. Add button to the navigation section
3. Add conditional render section for the tab content
4. Fetch data in `fetchData()` if needed

**Modify colors:**
Update Tailwind classes. The pattern is:
- `bg-{color}-{shade}` for backgrounds
- `text-{color}-{shade}` for text
- `border-{color}-{shade}` for borders
