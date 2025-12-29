# Sample Node.js Express TypeScript Server

A modular Express server with TypeScript for testing obfuscation and debugging.

## Project Structure

```
src/
├── types/              # TypeScript interfaces
│   ├── UserProfile.ts
│   ├── ProductItem.ts
│   └── index.ts
├── data/               # Mock data
│   ├── userData.ts
│   ├── productData.ts
│   └── index.ts
├── utils/              # Helper functions
│   ├── userUtils.ts
│   ├── productUtils.ts
│   ├── calculationUtils.ts
│   └── index.ts
├── controllers/        # Business logic
│   ├── userController.ts
│   ├── productController.ts
│   ├── calculationController.ts
│   └── index.ts
├── routes/             # Route definitions
│   ├── userRoutes.ts
│   ├── productRoutes.ts
│   ├── calculationRoutes.ts
│   └── index.ts
└── server.ts           # Main application file
```

## Setup

Install dependencies:
```bash
npm install
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### 1. GET /api/users
Get all users or filter by city

**Query Parameters:**
- `city` (optional): Filter users by city

**Examples:**
```
GET http://localhost:3000/api/users
GET http://localhost:3000/api/users?city=New York
```

### 2. GET /api/users/:id
Get a specific user by ID

**Example:**
```
GET http://localhost:3000/api/users/1
```

### 3. GET /api/products
Get all products or filter by category

**Query Parameters:**
- `category` (optional): Filter products by category

**Examples:**
```
GET http://localhost:3000/api/products
GET http://localhost:3000/api/products?category=Electronics
```

### 4. POST /api/calculate
Calculate various statistics

**Request Body:**
```json
{
  "operation": "averageAge"
}
```

**Available operations:**
- `averageAge`: Calculate average user age
- `inventoryValue`: Calculate total inventory value

**Example:**
```
POST http://localhost:3000/api/calculate
Content-Type: application/json

{
  "operation": "averageAge"
}
```

## Testing in Postman

Import these requests into Postman:

1. **Get All Users**: GET `http://localhost:3000/api/users`
2. **Get User by ID**: GET `http://localhost:3000/api/users/1`
3. **Get All Products**: GET `http://localhost:3000/api/products`
4. **Calculate Average Age**: POST `http://localhost:3000/api/calculate` with body `{"operation": "averageAge"}`

## Modular Architecture

The application follows a clean, modular architecture:

- **Types**: TypeScript interfaces for type safety
- **Data**: Mock data separated from business logic
- **Utils**: Reusable utility functions for calculations and data operations
- **Controllers**: Request handlers with business logic
- **Routes**: Express route definitions

## Function and Variable Names

The code includes clearly named functions and variables across multiple files for obfuscation testing:

**Utility Functions (src/utils/):**
- `calculateUserAverageAge()`
- `findUserById()`
- `getUsersByCity()`
- `getAllUsers()`
- `validateUserId()`
- `filterProductsByCategory()`
- `calculateTotalInventoryValue()`
- `getAllProducts()`
- `countInStockProducts()`
- `findMostExpensiveProduct()`
- `getProductsByPriceRange()`
- `performCalculation()`
- `isValidOperation()`

**Controllers (src/controllers/):**
- `handleGetAllUsers()`
- `handleGetUserById()`
- `handleGetAllProducts()`
- `handleCalculation()`

**Data Variables (src/data/):**
- `userDatabase`
- `productCatalog`

**Interfaces (src/types/):**
- `UserProfile`
- `ProductItem`
- `CalculationOperation`
- `CalculationResult`
