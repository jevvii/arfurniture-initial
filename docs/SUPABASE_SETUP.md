# Supabase Storage Integration for AR Furniture

This document outlines the implementation of Supabase Storage for the AR Furniture application. This system replaces the previous local/Cloudinary storage solutions to provide a scalable, centralized way to host product images and 3D models (GLB files).

## 1. Overview

The application uses **Supabase Storage** to host user-uploaded content.
- **Images**: Product thumbnails and gallery images.
- **3D Models**: AR-ready `.glb` files (up to 50MB).

All files are stored in a public bucket named `ARfurniture_bucket`.

## 2. Prerequisites

### Environment Variables
The server requires the following keys in the `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
> **Note**: The `SERVICE_ROLE_KEY` is used instead of the `ANON_KEY` to allow the backend to perform administrative tasks like deleting files without RLS (Row Level Security) policies interfering, although proper RLS policies should still be configured for frontend access.

### Dependencies
- `@supabase/supabase-js`: Official client library.
- `multer`: Middleware for handling `multipart/form-data` uploads.

## 3. Implementation Details

### Client Initialization (`server/index.mjs`)
The Supabase client is initialized conditionally to ensure the server doesn't crash if keys are missing.

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
```

### Storage Strategy
We use `multer.memoryStorage()` to hold uploaded files in RAM as Buffers before streaming them directly to Supabase. This avoids writing temporary files to the local server disk.

### Folder Structure
Files are organized hierarchically based on the product and variant names to keep the bucket clean.

| Content Type | Bucket Path |
|--------------|-------------|
| **Main Asset (Image)** | `{productName}/main/images/{timestamp}-{filename}` |
| **Main Asset (Model)** | `{productName}/main/model/{timestamp}-{filename}.glb` |
| **Variant Asset (Image)** | `{productName}/{variantName}/images/{timestamp}-{filename}` |
| **Variant Asset (Model)** | `{productName}/{variantName}/model/{timestamp}-{filename}.glb` |
| **Additional Images** | `{productName}/additional-images/{timestamp}-{filename}` |

*Note: All folder and file names are sanitized (lowercase, hyphens instead of spaces/special chars) before upload.*

## 4. API Endpoints

### 1. Upload Product/Variant Image
- **Endpoint**: `POST /api/upload/image`
- **Query Params**: `productName`, `variantName` (optional, defaults to 'main')
- **Body**: `form-data` with `file`.
- **Behavior**: Uploads image to the specific variant's image folder.

### 2. Upload Additional Image
- **Endpoint**: `POST /api/upload/additional-image`
- **Query Params**: `productName`
- **Body**: `form-data` with `file`.
- **Behavior**: Uploads image to `{productName}/additional-images/`.

### 3. Upload 3D Model
- **Endpoint**: `POST /api/upload/model`
- **Query Params**: `productName`, `variantName` (optional)
- **Body**: `form-data` with `file`.
- **Limits**: Increased file size limit to **50MB**.
- **Behavior**: Uploads file to the specific variant's model folder.

## 5. File Cleanup & Management

To prevent storage clutter ("orphan files"), the system implements intelligent cleanup logic:

### On Product Update (`PUT /api/products/:id`)
1.  **Image/Model Replacement**: If a new asset URL is provided for the main product, the **old file is immediately deleted**.
2.  **Additional Images Cleanup**: Removed URLs in the `images` array are automatically deleted from storage.
3.  **Variant Asset Auto-Cleanup**: 
    - When a variant's `imageUrl` or `arModelUrl` is updated, the server **automatically deletes the old file** to save space.
    - If a variant is deleted from the product, all its associated images and 3D models are purged from Supabase.

### On Product Deletion (`DELETE /api/products/:id`)
When a product is deleted, a **fully recursive** cleanup function `deleteProductFolders` is called. 
- It lists all objects under the `{productName}` prefix.
- It recursively traverses all subfolders (main, variants, types).
- It deletes every single file identified, effectively purging the entire product directory from the bucket.

## 6. Helper Functions

Several helper functions abstract the storage logic:

- **`sanitizeFolderName(name)`**: Converts "Gaming Chair 3000" -> "gaming-chair-3000".
- **`sanitizeFileName(originalName)`**: Sanitizes upload filenames while preserving extensions.
- **`getPathFromUrl(url)`**: Extracts the relative storage path from a full Supabase URL.
- **`deleteSupabaseFolder(path)`**: A recursive function that lists and removes all files and sub-directories within a given path.

## 7. Migration from Local/Cloudinary
Previously, files might have been stored locally or via Cloudinary.
- **Old way**: Relied on `fs` (file system) or third-party CDNs.
- **New way**: Fully integrated into the Supabase ecosystem, keeping data (MongoDB) and assets (Supabase Storage) loosely coupled but managed in sync via the backend API.
