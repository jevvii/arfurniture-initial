# ARfurniture - Setup Guide

## Prerequisites
- Node.js (v18+)
- npm

## Installation

```bash
npm install
```

## Configuration

### 1. Environment Variables (`.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AUTH_API_BASE` | Backend API URL (use your LAN IP for mobile testing) | `http://[your-ip]:4000` |

## Running the App

### Start Backend (Port 4000)
```bash
npm run auth-server
```

### Start Frontend (Port 3000)
```bash
npm run dev
```

## Accessing the App

**Important:** Always use your LAN IP address (not `localhost`) when accessing the app, so that the QR code works correctly for mobile AR viewing.

| Device | Frontend URL | Backend URL |
|--------|--------------|-------------|
| **Desktop** | `http://[your-ip]:3000` | `http://[your-ip]:4000` |
| **LAN (Phone)** | `http://[your-ip]:3000` | `http://[your-ip]:4000` |

### Find Your LAN IP
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

## File Uploads

Uploaded images and 3D models are stored in:
- `products/images/[product-name]/` - Product images
- `products/3dmodels/[product-name]/` - GLB models

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Images not loading on phone | Make sure `VITE_AUTH_API_BASE` uses your LAN IP, not `localhost` |