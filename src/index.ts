import express, { Router } from 'express';
import { userController } from './user';

// ==================== TYPE DEFINITIONS ====================
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  city: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// ==================== DATA ====================
const users: User[] = [
  { id: 1, name: 'John Anderson', email: 'john.anderson@example.com', age: 28, city: 'New York' },
  { id: 2, name: 'Sarah Mitchell', email: 'sarah.mitchell@example.com', age: 32, city: 'Los Angeles' },
  { id: 3, name: 'Michael Thompson', email: 'michael.thompson@example.com', age: 25, city: 'Chicago' },
  { id: 4, name: 'Emily Davis', email: 'emily.davis@example.com', age: 30, city: 'New York' },
  { id: 5, name: 'Robert Wilson', email: 'robert.wilson@example.com', age: 35, city: 'Chicago' }
];

const products: Product[] = [
  { id: 101, name: 'Wireless Headphones', price: 79.99, category: 'Electronics', inStock: true },
  { id: 102, name: 'Running Shoes', price: 119.99, category: 'Sports', inStock: true },
  { id: 103, name: 'Coffee Maker', price: 49.99, category: 'Home Appliances', inStock: false },
  { id: 104, name: 'Laptop Backpack', price: 39.99, category: 'Accessories', inStock: true },
  { id: 105, name: 'Smart Watch', price: 199.99, category: 'Electronics', inStock: true },
  { id: 106, name: 'Yoga Mat', price: 29.99, category: 'Sports', inStock: false }
];

// ==================== ROUTES ====================
const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all users or filter by city
router.get('/api/users',userController);

// Get user by ID
router.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, data: user });
});

// Get all products or filter by category
router.get('/api/products', (req, res) => {
  const { category } = req.query;
  const filteredProducts = category
    ? products.filter(p => p.category.toLowerCase() === (category as string).toLowerCase())
    : products;

  const totalValue = filteredProducts.filter(p => p.inStock).reduce((sum, p) => sum + p.price, 0);

  res.json({
    success: true,
    data: filteredProducts,
    metadata: { count: filteredProducts.length, totalInventoryValue: totalValue }
  });
});

// ==================== SERVER SETUP ====================
const app = express();
const port = 3000;

app.use(express.json());
app.use(router);

app.use((err:any, req:any, res:any, next:any)  => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('Endpoints: GET /health, /api/users, /api/users/:id, /api/products');
});
