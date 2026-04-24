# Email & SMTP System

## Overview
AR Furniture uses the **Brevo (formerly Sendinblue) API** for reliable transactional email delivery. The email system is specifically designed to bypass limitations on typical SMTP ports by communicating over HTTPS natively via the Brevo v3 API (`https://api.brevo.com/v3/smtp/email`).

All email functionalities are consolidated within the core email helper module located at `server/email-helper.mjs`.

## Setup & Configuration

To set up the email system, the following environment variables are required in your `.env` file:

```env
BREVO_API_KEY=your_brevo_v3_api_key
BREVO_FROM_EMAIL=your_verified_sender_email@domain.com
BREVO_FROM_NAME="AR Furniture"
```

## Core Module (`server/email-helper.mjs`)

The module exposes structured functions to securely dispatch fully responsive, highly-styled emails to customers. Under the hood, it uses the `sendEmailViaBrevoAPI()` utility which handles the HTTPS request directly to Brevo's REST API endpoint.

### 1. `sendEmailViaBrevoAPI(emailData)`
The base function that dispatches the request to Brevo. It takes an object containing:
- `sender`: The sender detail, falling back to environment variables.
- `to`: An array of recipient objects.
- `subject`: The subject line.
- `htmlContent`: The rich HTML version of the email.
- `textContent`: The plain text fallback version.

## Implemented Email Templates

### Password Reset (`sendPasswordResetEmail`)
Sends a 6-digit verification code to the user to reset their password.
- **Trigger**: When a user attempts to reset their password.
- **Features**: Time-sensitive instructions with a bold monospaced display for the reset code.

### Password Reset Confirmation (`sendPasswordResetConfirmationEmail`)
Sends a confirmation notice that the password was updated successfully.
- **Trigger**: After the successful submission of the reset code and the new password.
- **Features**: Clear messaging acknowledging the user's secure account update with instructions on how to reach support if unauthorized.

### Order Invoice (`sendOrderInvoiceEmail`)
Dispatches a detailed invoice immediately following a successful checkout.
- **Trigger**: Called via the `/api/orders` route when a new order is securely created and verified in the database.
- **Features**: 
  - Dynamic line items mapping (Products and Variants).
  - Price formatting (`₱`) localized for the Philippines (`en-PH`).
  - Automatic Subtotal, VAT (12%), and Shipping breakdown calculations.
  - Complete Shipping and Contact Address summaries.
  - Plain-text equivalent specifically formatted for receipt printers and legacy email clients.

## Email Template Design System

To ensure optimal layout and aesthetic integrity across countless email clients (Gmail, Apple Mail, Outlook), all emails adhere to strictly defined rules:

- **Ultra-Modern styling**: The UI is reminiscent of high-end SaaS applications, with rounded borders (where supported), card layouts, and subtle shadows.
- **Responsive Layout**: Designed for mobile-first with adaptive full-width scaling up to a `600px` max-width container for desktop.
- **Inline Styles**: To handle temperamental email rendering engines, all crucial structural CSS is implemented inline (`style="..."`).
- **Semantic Structure**: Relies on deeply nested `<table>` tags tailored explicitly to enforce the grid architecture inside older email clients that ignore modern `flex` or `grid` properties.
- **Plain Text Parity**: Every HTML email is coupled with a cleanly formatted plain text message serving both to improve deliverability scores and accommodate text-only readers.
