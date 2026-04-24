# Session Logs: 2026-02-09

## 1. Product Variant Management Refinement
- **Feature**: Enabled editing of existing product variants.
- **Frontend Changes (`ProductManager.tsx`)**:
    - Introduced `editingVariantId` state for edit mode tracking.
    - Updated `handleAddVariant` to handle updates via `setVariants(prev => prev.map(...))`.
    - Added `handleEditVariant` which populates the form and scrolls to it.
    - Added `cancelEditVariant` to reset the form.
    - Updated UI:
        - Two-row layout for variant fields (Name/Stock/Color in row 1, Image/Model in row 2).
        - Edit button added to each variant in the list.
        - Highlighting active variant being edited.
        - Dynamic button icons (Plus vs Save) and labels (Add vs Update).
        - **Asset Status Preview**: Added a small thumbnail of the variant's current/new image in the form header.
- **Backend Changes (`server/index.mjs`)**:
    - Updated product update logic to correctly handle `variants` and `images` arrays.

## 2. Customer Experience Optimization
- **Persistent View Mode (`ProductDetail.tsx`)**:
    - Modified variant selection to **persist the 3D View**. If a user is viewing a product in 3D, changing the color/variant will keep them in the 3D viewer instead of switching back to the static image.
- **UI Bug Fixes**:
    - Removed `overflow-hidden` on variant color swatches to allow color name labels (tooltips) to be visible.

## 3. Supabase Storage Infrastructure Restructuring
- **Folder Organization**:
    - Refined the directory structure to be product-centric and variant-aware:
        - Main Assets: `{productName}/main/{images|model}/{filename}`
        - Variant Assets: `{productName}/{variantName}/{images|model}/{filename}`
        - Additional Images: `{productName}/additional-images/{filename}`
- **Backend Logic Refinement**:
    - Renamed internal `gallery` references to `additional-images` for consistency.
    - **Automatic File Cleanup**:
        - When a variant's image or 3D model is updated, the server **automatically deletes the old version** from Supabase.
    - **Folder-Level Purging & Logging**:
        - Deleting a variant now automatically **purges its entire directory** in storage using robust recursive listing (`recursive: true`) to ensure no orphan files remain.
        - Deleting a product now triggers a **complete purge of the product's root directory**, recursively removing all subfolders in a single pass.
        - Added verbose server logging (`[STORAGE] 🗑️`) to track deletion success and help with storage diagnostics.
- **Upload API Enhancement**:
    - Updated upload endpoints to support a `variantName` query parameter for organized steering of assets.
- **Documentation**:
    - Completely updated `docs/SUPABASE_SETUP.md` to reflect the new architecture.

## 4. Instant Variant Persistence & Deletion (UX Improvement)
**Date**: 2026-02-09 14:30

### Problem
Previously, variants were only saved to the database when the user clicked "Update Product". This meant:
- Adding a variant → Files uploaded to Supabase → **NOT saved to DB** until product save
- Deleting a variant → Removed from UI → **Files NOT deleted from Supabase** until product save
- Poor UX: Users had to remember to save the product after every variant change

### Solution
Implemented **instant persistence** for variant operations:

#### Frontend Changes (`ProductManager.tsx`)
1. **`handleAddVariant`**:
   - Now immediately saves the product to the database after adding a variant
   - Uploads files → Adds to local state → **Saves to DB instantly**
   - Requires product to be saved first (shows error if `editingId` is null)
   - Updates the products list in real-time

2. **`handleRemoveVariant`**:
   - Changed from synchronous to `async` function
   - Immediately saves the product to the database after removing a variant
   - Triggers backend cleanup logic automatically
   - Updates the products list in real-time

3. **UI Improvements**:
   - Moved "Add Variant" button below the form inputs for better visual hierarchy
   - Button now shows text labels ("Add Variant" / "Update Variant") instead of just icons
   - Full-width button design for better mobile UX

#### Backend Changes (`server/index.mjs`)
1. **Enhanced Logging**:
   - Added `[UPDATE PRODUCT]` logs showing received variants
   - Added `[VARIANT CLEANUP]` logs showing old vs new variants comparison
   - Added `[STORAGE]` logs for file and folder deletion operations
   - Logs now show exact file paths being deleted and operation results

2. **Improved Deletion Logic**:
   - Fixed `deleteSupabaseFolder` function to properly handle nested folders
   - Now correctly deletes both `images/` and `model/` subfolders within variant directories
   - Added comprehensive error handling for non-existent folders
   - Deletion now works for both old structure (`product/variants/variant/`) and new structure (`product/variant/`)

3. **Variant Cleanup Flow**:
   ```
   User deletes variant → Frontend saves product → Backend compares old vs new variants
   → Detects deleted variant → Deletes specific files by URL → Purges variant folder
   → Logs success → Returns updated product
   ```

### Benefits
- ✅ **Instant Feedback**: Variants are immediately persisted when added or deleted
- ✅ **Automatic Cleanup**: Supabase Storage files are deleted immediately when variant is removed
- ✅ **No Orphaned Files**: Comprehensive folder deletion ensures no leftover files in storage
- ✅ **Better UX**: No need to remember to save the product after variant changes
- ✅ **Debugging**: Extensive logging makes it easy to track what's happening in storage operations

### Technical Notes
- Variant operations require an existing product (`editingId` must be set)
- Each variant add/delete triggers a full product update to maintain data consistency
- Backend cleanup runs automatically as part of the product update flow
- Deletion logic handles both file-level (specific URLs) and folder-level (recursive) cleanup

## 5. Local Storage Session Persistence
**Date**: 2026-02-22

### Problem
Previously, the user session and cart state were only stored in React `useState`. This meant that refreshing the page would cause the user to be logged out and the cart to be cleared from the UI.

### Solution
Implemented browser `localStorage` persistence to ensure the user session and cart survive page reloads.

#### Frontend Changes (`App.tsx`)
1. **Initial State Hydration**:
   - `user` state initialization now uses a lazy loader `() => { ... }` that attempts to retrieve and parse `arfurniture_user` from `localStorage`.
   - Added error handling to gracefully remove malformed JSON from `localStorage` during parsing.

2. **Session Preservation**:
   - `handleUserLogin`, `handleAdminLogin`, and `handleSignup` now save the resolved `User` object into `localStorage` upon success.
   - `handleUpdateUser` and `handleUpdateAddress` now mirror updates into `localStorage` to reflect inline profile changes persisting.
   - `handleLogout` executes `localStorage.removeItem('arfurniture_user')` as cleanup.

3. **Cart Rehydration**:
   - Introduced a `useEffect` hook that fires only on component mount.
   - If a `user` is hydrated from `localStorage` at startup, the app makes an immediate async database query `db.getCart(user._id)` to load their specific cart items into state.

## 6. Notifications System for Order Status
**Date**: 2026-02-22

### Problem
Users had no way of knowing when their order status changed unless they manually checked their orders page.

### Solution
Implemented a real-time notification system to alert users when their order status is updated by an admin.

#### Backend Changes (`server/routes/notifications.mjs`, `server/routes/orders.mjs`)
1. **Notifications Collection**: Added a new MongoDB collection to store user notifications.
2. **Event Emitter Hook**: Set up an `EventEmitter` inside `notifications.mjs` dedicated to tracking new notifications globally across the server.
3. **SSE Connection Stream**: Created a new `/api/notifications/stream/:userId` endpoint using Server-Sent Events (SSE) to forward pushes directly to users via `keep-alive` streams.
4. **Order Status Trigger**: When an admin updates an order's status (e.g., pending -> shipped), a new notification is mapped to the DB, and the `notificationEmitter` immediately broadcasts it to listening clients.
5. **Notification API**: Added standard routes to fetch previous notifications for a user, mark a single notification as read, and mark all notifications as read.

#### Frontend Changes (`components/Layout.tsx`, etc.)
1. **Bell Icon**: Replaced the visual "Heart" icon in the top navigation with a functional "Bell" (Notifications) icon for logged-in customers.
2. **Unread Badge**: The Bell icon now displays a red badge with the count of unread notifications.
3. **Notifications Dropdown**: Clicking the Bell opens a dropdown displaying recent notifications, sorted by date. Users can click notifications to mark them as read or click "Mark all as read" to clear the badge.
4. **Real-time Webhook (SSE)**: The layout component sets up a Server-Sent Events (SSE) `EventSource` connection to listen for push notifications from the server via an `EventEmitter`, eliminating the need to actively poll while providing instant updates.

## 7. Password Reset Data Modeling (Security & Architecture Improvement)
**Date**: 2026-02-22

### Problem
Previously, password reset tokens and expiration dates were stored directly on the `users` document in MongoDB. This cluttered the user schema, coupled authentication flows tightly to user records, and made it difficult in the future to track multiple concurrent reset requests or efficiently clean up expired tokens without scanning the entire users collection.

### Solution
Migrated the password reset state into a dedicated `password_resets` collection.

#### Backend Changes (`server/routes/auth.mjs`, `server/config/database.mjs`)
1. **Dedicated Collection (`password_resets`)**: Introduced a new collection specifically to handle ephemeral reset tokens.
2. **Token Generation (`/forgot-password`)**: Instead of `users.updateOne`, the API now creates a standalone document in `password_resets` containing the `email`, `userId`, `resetCode`, `resetToken`, `expiresAt`, and `attempts`. It first deletes any existing tokens for that email to ensure only the latest token is active.
3. **Token Verification (`/forgot-password/verify-code`)**: The verification endpoint queries the `password_resets` collection directly using the token. It handles attempt counting and expiration verification natively on the reset document. Exceeded attempts or expired tokens result in the deletion of the token document instead of leaving dirty fields on the user record.
4. **Password Reset Execution (`/forgot-password/reset-password`)**: Validates the token and code from the `password_resets` collection, fetches the associated user by ID, hashes the new password, updates the user's document, and cleans up the token document.

### Benefits
- ✅ **Cleaner User Schema**: User documents no longer act as trash cans for temporary authentication state.
- ✅ **Improved Security**: Reset tokens are isolated. Failed attempts and expirations result in immediate cascading deletion of the token, leaving zero residue.
- ✅ **Database Performance**: Querying for reset tokens happens on a smaller, dedicated collection, enabling easier indexing and TTL (Time-To-Live) index implementation if needed.

## 8. Order Status Email Notifications
**Date**: 2026-02-22

### Problem
While users received in-app notifications for order status changes, they did not receive emails, making it easy to miss updates if they weren't actively checking the application.

### Solution
Implemented an automated SMTP email notification system that triggers whenever an admin updates the status of an order.

#### Backend Changes (`server/email-helper.mjs`, `server/routes/orders.mjs`)
1. **New Email Template (`sendOrderStatusEmail`)**: Created a modern, responsive HTML email template using inline CSS for maximum compatibility. The template includes dynamic styling (e.g., color-coded badges) based on the specific status (Pending, Processing, Shipped, Delivered, Cancelled).
2. **Order Router Integration**: Modified the `PATCH /:id/status` endpoint to call `sendOrderStatusEmail` after successfully updating the database and emitting the in-app notification.
3. **Data Resolution & Fallback**: Added cross-collection logic to resolve the customer's email and name. If the order document itself lacks an email (e.g., older orders), the system falls back to querying the `users` collection using the `userId` attached to the order.
4. **Resiliency**: The email sending process is asynchronous and wraps errors cleanly so that a failed email does not prevent the order status from being updated in the database or the in-app notification from being sent.

### Benefits
- ✅ **Proactive Communication**: Customers are immediately informed of order progress without needing to open the app.
- ✅ **Consistent Branding**: The email template perfectly matches the existing premium application aesthetic.
- ✅ **Robust Fallbacks**: The system intelligently recovers missing contact information from the user profile.
