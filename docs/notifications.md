# Notifications System

## Overview
The ARfurniture application now includes a built-in notification system for customers. It informs users about important updates regarding their account, specifically focusing on order status changes.

## Backend Architecture

### MongoDB Collection
A new collection `notifications` has been added.

**Schema:**
- `_id`: ObjectId
- `userId`: string (ID of the user receiving the notification)
- `orderId`: string (ID of the related order, if applicable)
- `type`: string (e.g., `'order_status'`)
- `status`: string (the new order status, e.g., `'processing'`, `'shipped'`, `'delivered'`)
- `message`: string (user-friendly message)
- `isRead`: boolean (whether the user has viewed the notification)
- `createdAt`: Date
- `updatedAt`: Date

### Server Routes
`server/routes/notifications.mjs` handles notification logic:
- `GET /api/notifications/:userId`: Retrieves all notifications for a specific user, sorted from newest to oldest.
- `PATCH /api/notifications/:id/read`: Marks a specific notification as read.
- `PATCH /api/notifications/user/:userId/read-all`: Marks all unread notifications for a user as read.

### Order Integration
The notification system is integrated into the admin order management flow (`server/routes/orders.mjs`).
When an admin updates an order's status using `PATCH /api/orders/:id/status`, if the new status differs from the old status, a notification is automatically inserted into the `notifications` collection for the order's `userId`.

## Frontend Integration

### Header Notification Dropdown
The visual "Heart" icon in the `Layout.tsx` header has been replaced by a "Bell" (Notification) icon.
- A red badge indicates the count of unread notifications.
- Clicking the Bell icon opens a dropdown listing the user's notifications.
- Unread notifications are highlighted (e.g., darker text, blue dot) and can be clicked to be marked as read.
- There is a "Mark all as read" button inside the dropdown for convenience.
- Fetching happens on component mount if a user is logged in (and is not an admin).

## Future Enhancements
- Real-time updates via WebSockets or Server-Sent Events (SSE).
- Additional notification types (e.g., system announcements, restock alerts, promotions).
