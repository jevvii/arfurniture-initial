# Order System Documentation

## Overview

The order system handles customer orders with support for product variants, optimized data storage, and automatic stock management. Orders persist in MongoDB and include complete shipping and customer information.

---

## Order Data Model

### OrderItem Schema

Each item in an order uses a lightweight structure that stores only essential information:

```typescript
interface OrderItem {
  productId: string; // Reference to product
  productName: string; // Snapshot of product name
  price: number; // Snapshot of price at time of order
  quantity: number; // Quantity ordered
  imageUrl: string; // Product image URL
  category: string; // Product category
  variantId?: string; // Variant ID if applicable (e.g., "red")
  variantName?: string; // Variant name if applicable (e.g., "Red")
}
```

**Design Rationale:**

- **Snapshots**: Product name, price, and image are captured at order time to preserve historical accuracy
- **Lightweight**: No redundant data (AR models, dimensions, full variant objects, etc.)
- **Resilient**: Orders remain valid even if products/variants are deleted later
- **Queryable**: Variant information easily accessible for reports and filtering

---

### Order Schema

```typescript
interface Order {
  _id: string;
  userId: string;
  customerName: string;
  recipientName: string; // Who will receive the order
  contactNumber: string; // Contact phone number
  items: OrderItem[]; // Array of order items
  totalAmount: number; // Total order value
  shippingAddress: Address; // Full shipping address
  status: "pending" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
}
```

**Address Structure:**

```typescript
interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  landmark?: string; // Optional landmark for easier delivery
}
```

---

## MongoDB Collection Structure

### Example Order Document

```javascript
{
  _id: ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
  userId: "65abc123def456789012",
  customerName: "John Doe",
  recipientName: "Jane Doe",
  contactNumber: "+63 912 345 6789",
  items: [
    {
      productId: "65def456789abc123",
      productName: "Modern Sofa",
      price: 25000,
      quantity: 2,
      imageUrl: "https://storage.example.com/sofa-red.jpg",
      category: "Living Room",
      variantId: "red",
      variantName: "Red"
    },
    {
      productId: "65ghi789012def456",
      productName: "Coffee Table",
      price: 8500,
      quantity: 1,
      imageUrl: "https://storage.example.com/table.jpg",
      category: "Living Room"
      // No variantId/variantName - default product
    }
  ],
  totalAmount: 58500,
  shippingAddress: {
    street: "123 Main St, Apt 4B",
    city: "Quezon City",
    state: "Metro Manila",
    zipCode: "1100",
    country: "Philippines",
    landmark: "Near SM North"
  },
  status: "pending",
  createdAt: ISODate("2024-02-14T03:30:00Z")
}
```

---

## Stock Management

### Stock Validation Flow

Before creating an order, the system validates stock availability:

1. **For items with variants**:
   - Checks `product.variants[].stock` for the specific variant
   - Fails if `variant.stock < order.quantity`

2. **For items without variants**:
   - Checks `product.stock`
   - Fails if `product.stock < order.quantity`

### Stock Reduction

After validation passes, stock is reduced atomically:

**Variant Stock Reduction:**

```javascript
db.products.updateOne(
  { _id: productId, "variants.id": variantId },
  { $inc: { "variants.$.stock": -quantity } },
);
```

**Product Stock Reduction:**

```javascript
db.products.updateOne({ _id: productId }, { $inc: { stock: -quantity } });
```

**Atomic Operation:** Using MongoDB's `$inc` operator ensures thread-safe stock updates, preventing overselling in high-concurrency scenarios.

---

## API Endpoints

### Get All Orders

```
GET /api/orders
```

**Response:**

```json
[
  {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "userId": "65abc123def456789012",
    "customerName": "John Doe",
    "items": [...],
    "totalAmount": 58500,
    "status": "pending",
    "createdAt": "2024-02-14T03:30:00Z"
  }
]
```

---

### Create Order

```
POST /api/orders
```

**Request Body:**

```json
{
  "userId": "65abc123def456789012",
  "customerName": "John Doe",
  "recipientName": "Jane Doe",
  "contactNumber": "+63 912 345 6789",
  "items": [
    {
      "productId": "65def456789abc123",
      "productName": "Modern Sofa",
      "price": 25000,
      "quantity": 2,
      "imageUrl": "https://...",
      "category": "Living Room",
      "variantId": "red",
      "variantName": "Red"
    }
  ],
  "totalAmount": 50000,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Quezon City",
    "state": "Metro Manila",
    "zipCode": "1100",
    "country": "Philippines",
    "landmark": "Near SM North"
  }
}
```

**Success Response (201):**

```json
{
  "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
  "userId": "65abc123def456789012",
  "status": "pending",
  "createdAt": "2024-02-14T03:30:00Z",
  ...
}
```

**Error Responses:**

**Insufficient Stock (400):**

```json
{
  "error": "Insufficient stock for Modern Sofa (Red). Only 2 available."
}
```

**Product Not Found (400):**

```json
{
  "error": "Product Modern Sofa is no longer available"
}
```

**Variant Not Found (400):**

```json
{
  "error": "Variant Red is no longer available"
}
```

---

### Update Order Status

```
PATCH /api/orders/:id/status
```

**Request Body:**

```json
{
  "status": "shipped"
}
```

**Valid Statuses:**

- `pending` - Order placed, awaiting processing
- `shipped` - Order dispatched
- `delivered` - Order completed
- `cancelled` - Order cancelled

**Success Response (200):**

```json
{
  "success": true
}
```

---

## Frontend Integration

### Creating an Order from Cart

```typescript
// Transform cart items to order items
const orderItems = cartItems.map((item) => ({
  productId: item._id,
  productName: item.name,
  price: item.price,
  quantity: item.quantity,
  imageUrl: item.imageUrl,
  category: item.category,
  variantId: item.selectedVariant?.id,
  variantName: item.selectedVariant?.name,
}));

// Create order
await db.createOrder({
  userId: user._id,
  customerName: user.name,
  recipientName: formData.recipientName,
  contactNumber: formData.contactNumber,
  items: orderItems,
  totalAmount: calculateTotal(cartItems),
  shippingAddress: {
    street: formData.street,
    city: formData.city,
    state: formData.state,
    zipCode: formData.zipCode,
    country: formData.country,
    landmark: formData.landmark,
  },
});
```

### Error Handling

```typescript
try {
  await db.createOrder(orderData);
} catch (error: any) {
  // Backend provides detailed error messages
  const errorMessage =
    error?.response?.data?.error || error?.message || "Failed to place order";

  // Show to user
  alert(errorMessage);
  // Example: "Insufficient stock for Modern Sofa (Red). Only 2 available."
}
```

---

## Database Queries

### Find Orders by User

```javascript
db.orders.find({ userId: "65abc123def456789012" }).sort({ createdAt: -1 });
```

### Find Orders with Specific Variant

```javascript
db.orders.find({ "items.variantId": "red" });
```

### Find Pending Orders

```javascript
db.orders.find({ status: "pending" });
```

### Get Order Statistics

```javascript
db.orders.aggregate([
  { $match: { status: "delivered" } },
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: "$totalAmount" },
      orderCount: { $sum: 1 },
    },
  },
]);
```

---

## Data Migration Notes

### Upgrading from Old Order Format

If you have existing orders using `CartItem[]` instead of `OrderItem[]`, you can migrate them:

```javascript
// Migration script
db.orders.find({ "items.description": { $exists: true } }).forEach((order) => {
  const transformedItems = order.items.map((item) => ({
    productId: item._id,
    productName: item.name,
    price: item.price,
    quantity: item.quantity,
    imageUrl: item.imageUrl,
    category: item.category,
    variantId: item.selectedVariant?.id,
    variantName: item.selectedVariant?.name,
  }));

  db.orders.updateOne(
    { _id: order._id },
    { $set: { items: transformedItems } },
  );
});
```

---

## Best Practices

### 1. Always Validate Stock

Never skip stock validation - it prevents overselling and provides clear user feedback.

### 2. Use Atomic Operations

Always use `$inc` for stock updates to prevent race conditions in concurrent orders.

### 3. Preserve Order History

Order items are snapshots - they should never be updated after creation, ensuring historical accuracy.

### 4. Handle Deleted Products Gracefully

Since orders store snapshots, they remain valid even if products are deleted. Display order history using the stored `productName` and `imageUrl`.

### 5. Track Variants Properly

Always include both `variantId` and `variantName` when a variant is selected - this makes orders queryable and human-readable.

---

## Security Considerations

1. **User Authorization**: Verify that `userId` in order matches authenticated user
2. **Price Validation**: Backend should fetch current price and validate against submitted price to prevent tampering
3. **Stock Locking**: Consider implementing optimistic locking for high-traffic scenarios
4. **Input Validation**: Validate all address fields and contact information

---

## Performance Optimization

### Indexing Recommendations

```javascript
// Orders collection
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ "items.variantId": 1 });

// Products collection (for stock queries)
db.products.createIndex({ "variants.id": 1 });
```

### Query Optimization

- Use projection to fetch only needed fields
- Implement pagination for order lists
- Cache order statistics in dashboard

---

## Troubleshooting

### Issue: Stock Not Reducing

**Check:**

1. Verify stock field exists on product/variant
2. Check server logs for "Reduced stock" debug messages
3. Ensure MongoDB connection is active

### Issue: "Insufficient stock" but product shows stock

**Possible Causes:**

- Checking wrong stock field (product vs variant)
- Stock reduced by concurrent order
- Database replication lag

### Issue: Orders with Missing Variant Data

**Solution:**
Ensure Cart.tsx properly transforms `selectedVariant?.id` and `selectedVariant?.name` before sending to backend.

---

## Related Documentation

- [Cart Schema](./cart_schema.md) - Cart persistence and structure
- [Product Schema](./product_schema.md) - Product and variant structure (if exists)
- [API Documentation](./API.md) - Complete API reference (if exists)
