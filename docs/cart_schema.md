# Cart Database Schema Design

## Overview

This document outlines the MongoDB schema design for the persistent shopping cart feature.
The design uses a **Reference Model**, where the cart stores references to products rather than duplicating product data. This ensures the cart always reflects the most up-to-date product information (price, details, availability).

## 1. Mongoose Schema Definition

### Schema: `Cart`

```typescript
import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
  product: mongoose.Types.ObjectId; // Reference to Product
  variantId?: string; // Optional: ID of the selected variant
  quantity: number;
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId; // Reference to User
  items: ICartItem[];
  updatedAt: Date;
}

const CartSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One cart per user
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: {
          type: String,
          default: null,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// Compound index to ensure efficient lookup of a user's cart
CartSchema.index({ user: 1 });

export default mongoose.model<ICart>("Cart", CartSchema);
```

## 2. API Response Type (Frontend)

When fetching the cart, the backend will `populate` the `product` field. The frontend will receive a structure similar to this:

```typescript
// Type definition for the populated cart received by client
export interface PopulatedCartItem {
  _id: string; // The cart item sub-document ID
  product: Product; // Full product object (populated)
  variantId?: string;
  quantity: number;
}
```

## 3. Key Decisions

- **Reference Model**: chosen to avoid data staleness.
- **Separate Collection**: `carts` collection usually scales better than embedding cart items directly into the `users` collection, allowing for potentially large carts without blooming the User document size.
- **Variant Handling**: `variantId` is stored as a string to match the frontend's current handling of variants logic.
