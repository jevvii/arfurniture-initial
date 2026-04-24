/**
 * Email helper for AR Furniture using Brevo SMTP API
 * Modern, responsive email templates with inline CSS for maximum compatibility
 */

/**
 * Send email using Brevo API (HTTPS-based)
 * @param {Object} emailData - Email configuration
 * @param {Object} emailData.sender - Sender information
 * @param {Array} emailData.to - Array of recipients
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.htmlContent - HTML content
 * @param {string} emailData.textContent - Plain text content
 * @returns {Promise<Object>} Result of the email sending operation
 */
async function sendEmailViaBrevoAPI(emailData) {
  try {
    const { sender, to, subject, htmlContent, textContent } = emailData;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: sender,
        to: to,
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
        headers: {
          'X-Mailer': 'AR Furniture v1.0',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo API Error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Email sent successfully via Brevo API:', data.messageId);

    return {
      success: true,
      messageId: data.messageId,
      data: data
    };

  } catch (error) {
    console.error('Error sending email via Brevo API:', error);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send password reset email with verification code
 * @param {Object} resetData - Password reset information
 * @param {string} resetData.email - User's email address
 * @param {string} resetData.fullName - User's full name
 * @param {string} resetData.resetCode - 6-digit verification code
 * @returns {Promise<Object>} Result of the email sending operation
 */
export async function sendPasswordResetEmail(resetData) {
  try {
    const { email, fullName, resetCode } = resetData;

    if (!email) {
      throw new Error('Email address is required');
    }

    // Ultra-modern, premium email HTML template
    const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Notification - AR Furniture</title>
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; }
    
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 32px 24px !important; }
      .header { padding: 40px 24px !important; }
      .footer { padding: 32px 24px !important; }
      .code-text { font-size: 32px !important; letter-spacing: 4px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">Reset your password for AR Furniture. Your code is ${resetCode}</div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table class="container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td class="header" align="center" style="background: #111827; padding: 48px 40px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">Reset your password</h1>
              <p style="color: #9ca3af; margin: 8px 0 0; font-size: 15px; font-weight: 400;">We received a request to reset your password</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding: 40px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.5;">Hi ${fullName},</p>
              <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; line-height: 1.5;">Use the code below to reset your password. This code will expire in <span style="color: #111827; font-weight: 500;">15 minutes</span>.</p>
              
              <!-- Code Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; border-radius: 8px;">
                <tr>
                  <td align="center" style="padding: 32px 24px;">
                    <p style="margin: 0 0 12px; font-size: 13px; color: #6b7280; font-weight: 500;">Your verification code</p>
                    <div class="code-text" style="font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 36px; font-weight: 600; color: #111827; letter-spacing: 6px; background-color: #ffffff; padding: 16px 28px; border-radius: 6px; border: 1px solid #e5e7eb; display: inline-block;">${resetCode}</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">If you didn't request a password reset, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">&copy; ${new Date().getFullYear()} AR Furniture</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This email was sent automatically. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Modern plain text version
    const textContent = `
AR FURNITURE: PASSWORD RESET
---------------------------------
Hello ${fullName},

We received a request to reset your password. Use the code below to proceed:

RESET CODE: ${resetCode}

This code expires in 15 minutes.

If you did not request this, please ignore this email. Never share your reset code.

Best regards,
The AR Furniture Team
    `.trim();

    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: process.env.BREVO_FROM_NAME || 'AR Furniture Security',
        email: process.env.BREVO_FROM_EMAIL
      },
      to: [{ email: email }],
      subject: 'Verification Code - AR Furniture',
      htmlContent: htmlContent,
      textContent: textContent
    };

    const result = await sendEmailViaBrevoAPI(emailData);
    if (result.success) {
      console.log('Password reset email sent successfully:', result.messageId);
    }
    return result;

  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetConfirmationEmail(confirmationData) {
  try {
    const { email, fullName } = confirmationData;

    if (!email) {
      throw new Error('Email address is required');
    }

    // Ultra-modern, premium confirmation HTML template
    const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Update - AR Furniture</title>
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; }
    
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 32px 24px !important; }
      .header { padding: 40px 24px !important; }
      .footer { padding: 32px 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">Your AR Furniture password has been updated successfully.</div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table class="container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td class="header" align="center" style="background: #111827; padding: 48px 40px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">Password updated</h1>
              <p style="color: #9ca3af; margin: 8px 0 0; font-size: 15px; font-weight: 400;">Your password has been successfully changed</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding: 40px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.5;">Hi ${fullName},</p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280; line-height: 1.5;">Your password has been updated successfully. You can now sign in with your new password.</p>
              
              <p style="margin: 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">If you didn't make this change, please contact us immediately at support@arfurniture.com</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">&copy; ${new Date().getFullYear()} AR Furniture</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This email was sent automatically. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Modern plain text version
    const textContent = `
AR FURNITURE: PASSWORD UPDATED
---------------------------------
Hello ${fullName},

Your password has been changed successfully.

If you did not make this change, please contact our support team immediately at support@arfurniture.com.

Best regards,
The AR Furniture Team
    `.trim();

    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: process.env.BREVO_FROM_NAME || 'AR Furniture Security',
        email: process.env.BREVO_FROM_EMAIL
      },
      to: [{ email: email }],
      subject: 'Security Update: Password Changed - AR Furniture',
      htmlContent: htmlContent,
      textContent: textContent
    };

    const result = await sendEmailViaBrevoAPI(emailData);
    if (result.success) {
      console.log('Confirmation email sent successfully:', result.messageId);
    }
    return result;

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send order invoice email after successful order placement
 * @param {Object} invoiceData - Order invoice information
 * @param {string} invoiceData.email - Customer's email address
 * @param {string} invoiceData.customerName - Customer's full name
 * @param {string} invoiceData.recipientName - Recipient's name
 * @param {string} invoiceData.contactNumber - Contact number
 * @param {string} invoiceData.orderId - Order ID
 * @param {Array} invoiceData.items - Array of order items
 * @param {number} invoiceData.totalAmount - Total amount (inclusive of VAT)
 * @param {Object} invoiceData.shippingAddress - Shipping address object
 * @param {Date} invoiceData.orderDate - Date of order
 * @returns {Promise<Object>} Result of the email sending operation
 */
export async function sendOrderInvoiceEmail(invoiceData) {
  try {
    const {
      email,
      customerName,
      recipientName,
      contactNumber,
      orderId,
      items,
      totalAmount,
      shippingAddress,
      orderDate
    } = invoiceData;

    if (!email) {
      throw new Error('Email address is required');
    }

    const dateStr = (orderDate ? new Date(orderDate) : new Date()).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Calculate subtotal and VAT from total (total = subtotal * 1.12)
    const subtotal = totalAmount / 1.12;
    const vat = totalAmount - subtotal;

    const formatPrice = (amount) => `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Build items rows
    const itemRows = items.map((item, index) => `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 14px 16px; font-size: 14px; color: #374151; vertical-align: top;">
          <div style="font-weight: 600; color: #111827;">${item.productName}</div>
          ${item.variantName ? `<div style="margin-top: 6px;"><span style="display: inline-block; background-color: #eef2ff; color: #4338ca; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; border: 1px solid #c7d2fe;">● ${item.variantName}</span></div>` : ''}
          ${item.category ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${item.category}</div>` : ''}
        </td>
        <td style="padding: 14px 16px; font-size: 14px; color: #374151; text-align: center; vertical-align: top;">${item.quantity}</td>
        <td style="padding: 14px 16px; font-size: 14px; color: #374151; text-align: right; vertical-align: top;">${formatPrice(item.price)}</td>
        <td style="padding: 14px 16px; font-size: 14px; color: #111827; text-align: right; font-weight: 600; vertical-align: top;">${formatPrice(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    // Build shipping address text
    const addrParts = [];
    if (shippingAddress?.street) addrParts.push(shippingAddress.street);
    if (shippingAddress?.landmark) addrParts.push(shippingAddress.landmark);
    if (shippingAddress?.city) addrParts.push(shippingAddress.city);
    if (shippingAddress?.state) addrParts.push(shippingAddress.state);
    if (shippingAddress?.zipCode) addrParts.push(shippingAddress.zipCode);
    if (shippingAddress?.country) addrParts.push(shippingAddress.country);
    const addressStr = addrParts.join(', ') || 'Not provided';

    const shortOrderId = orderId.slice(-8).toUpperCase();

    const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Invoice - AR Furniture</title>
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; }
    
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 24px 16px !important; }
      .header { padding: 32px 16px !important; }
      .footer { padding: 24px 16px !important; }
      .item-table { font-size: 12px !important; }
      .hide-mobile { display: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">Your AR Furniture order #${shortOrderId} has been placed successfully. Total: ${formatPrice(totalAmount)}</div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table class="container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td class="header" align="center" style="background: #111827; padding: 48px 40px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">Order Confirmed</h1>
              <p style="color: #9ca3af; margin: 8px 0 0; font-size: 15px; font-weight: 400;">Thank you for your purchase!</p>
            </td>
          </tr>

          <!-- Order Info Badge -->
          <tr>
            <td class="content" style="padding: 32px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Order ID</p>
                          <p style="margin: 4px 0 0; font-size: 16px; color: #111827; font-weight: 700; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; letter-spacing: 1px;">#${shortOrderId}</p>
                        </td>
                        <td align="right">
                          <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Date</p>
                          <p style="margin: 4px 0 0; font-size: 14px; color: #111827; font-weight: 500;">${dateStr}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td class="content" style="padding: 24px 40px 0;">
              <p style="margin: 0 0 8px; font-size: 15px; color: #374151; line-height: 1.5;">Hi ${customerName},</p>
              <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.5;">We've received your order and it's now being processed. Here's your invoice:</p>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td class="content" style="padding: 24px 40px;">
              <table class="item-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px 16px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Item</td>
                  <td style="padding: 12px 16px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Qty</td>
                  <td style="padding: 12px 16px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Price</td>
                  <td style="padding: 12px 16px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Total</td>
                </tr>
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td class="content" style="padding: 0 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="50%"></td>
                  <td width="50%">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Subtotal</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #374151; text-align: right;">${formatPrice(subtotal)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">VAT (12%)</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #374151; text-align: right;">${formatPrice(vat)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Shipping</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #059669; text-align: right; font-weight: 500;">Free</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0;"><div style="border-top: 2px solid #e5e7eb; margin: 8px 0;"></div></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 18px; color: #111827; font-weight: 700;">Total</td>
                        <td style="padding: 8px 0; font-size: 18px; color: #111827; text-align: right; font-weight: 700;">${formatPrice(totalAmount)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping & Contact Info -->
          <tr>
            <td class="content" style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="50%" style="vertical-align: top; padding-right: 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Ship To</p>
                          <p style="margin: 0 0 4px; font-size: 14px; color: #111827; font-weight: 600;">${recipientName || customerName}</p>
                          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">${addressStr}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="vertical-align: top; padding-left: 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Contact</p>
                          <p style="margin: 0 0 4px; font-size: 14px; color: #111827; font-weight: 600;">${contactNumber || 'N/A'}</p>
                          <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">${email}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Note -->
          <tr>
            <td class="content" style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 4px; font-size: 14px; color: #4338ca; font-weight: 600;">📦 What's next?</p>
                    <p style="margin: 0; font-size: 13px; color: #6366f1; line-height: 1.5;">Your order is now <strong>pending</strong>. We'll update you once it moves to processing and shipping. You can track your order status in the app.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">&copy; ${new Date().getFullYear()} AR Furniture</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This email was sent automatically. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Plain text version
    const itemsText = items.map((item, i) =>
      `  ${i + 1}. ${item.productName}${item.variantName ? `\n     Variant: ${item.variantName}` : ''} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`
    ).join('\n');

    const textContent = `
AR FURNITURE: ORDER INVOICE
---------------------------------
Order #${shortOrderId}
Date: ${dateStr}

Hello ${customerName},

Thank you for your order! Here are the details:

ITEMS:
${itemsText}

SUMMARY:
  Subtotal: ${formatPrice(subtotal)}
  VAT (12%): ${formatPrice(vat)}
  Shipping: Free
  Total: ${formatPrice(totalAmount)}

SHIP TO:
  ${recipientName || customerName}
  ${addressStr}

CONTACT:
  ${contactNumber || 'N/A'}
  ${email}

Your order status is currently PENDING. We will notify you once it's being processed.

Best regards,
The AR Furniture Team
    `.trim();

    const emailData = {
      sender: {
        name: process.env.BREVO_FROM_NAME || 'AR Furniture',
        email: process.env.BREVO_FROM_EMAIL
      },
      to: [{ email: email }],
      subject: `Order Confirmed #${shortOrderId} - AR Furniture`,
      htmlContent: htmlContent,
      textContent: textContent
    };

    const result = await sendEmailViaBrevoAPI(emailData);
    if (result.success) {
      console.log('Invoice email sent successfully:', result.messageId);
    }
    return result;

  } catch (error) {
    console.error('Error sending invoice email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send order status update email
 * @param {Object} statusData - Order status information
 * @param {string} statusData.email - Customer's email address
 * @param {string} statusData.customerName - Customer's full name
 * @param {string} statusData.orderId - Order ID
 * @param {string} statusData.status - New order status
 * @returns {Promise<Object>} Result of the email sending operation
 */
export async function sendOrderStatusEmail(statusData) {
  try {
    const { email, customerName, orderId, status } = statusData;

    if (!email) {
      throw new Error('Email address is required');
    }

    const shortOrderId = orderId.slice(-8).toUpperCase();

    // Status color mapping
    const statusColors = {
      pending: '#eab308',     // Yellow
      processing: '#3b82f6',  // Blue
      shipped: '#a855f7',     // Purple
      delivered: '#22c55e',   // Green
      cancelled: '#ef4444'    // Red
    };

    const statusColor = statusColors[status.toLowerCase()] || '#6b7280';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

    const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Status Update - AR Furniture</title>
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; }
    
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 32px 24px !important; }
      .header { padding: 40px 24px !important; }
      .footer { padding: 32px 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">Update on your AR Furniture order #${shortOrderId}: status changed to ${statusLabel}</div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table class="container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td class="header" align="center" style="background: #111827; padding: 48px 40px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em;">Order Update</h1>
              <p style="color: #9ca3af; margin: 8px 0 0; font-size: 15px; font-weight: 400;">Your order status has been updated</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding: 40px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.5;">Hi ${customerName},</p>
              <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; line-height: 1.5;">Your order <strong>#${shortOrderId}</strong> has been updated to:</p>
              
              <!-- Status Badge Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td align="center" style="padding: 24px;">
                    <div style="display: inline-block; background-color: ${statusColor}15; color: ${statusColor}; font-size: 18px; font-weight: 700; padding: 10px 24px; border-radius: 9999px; border: 1px solid ${statusColor}40; letter-spacing: 0.05em; text-transform: uppercase;">
                      ${statusLabel}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 32px 0 0; font-size: 15px; color: #6b7280; line-height: 1.5;">You can continue to track your order progress in the AR Furniture app.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">&copy; ${new Date().getFullYear()} AR Furniture</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This email was sent automatically. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `
AR FURNITURE: ORDER UPDATE
---------------------------------
Hello ${customerName},

Your order #${shortOrderId} has been updated to: ${statusLabel.toUpperCase()}

You can track your order status in the app.

Best regards,
The AR Furniture Team
    `.trim();

    const emailData = {
      sender: {
        name: process.env.BREVO_FROM_NAME || 'AR Furniture',
        email: process.env.BREVO_FROM_EMAIL
      },
      to: [{ email: email }],
      subject: `Order ${statusLabel} #${shortOrderId} - AR Furniture`,
      htmlContent: htmlContent,
      textContent: textContent
    };

    const result = await sendEmailViaBrevoAPI(emailData);
    if (result.success) {
      console.log('Order status email sent successfully:', result.messageId);
    }
    return result;

  } catch (error) {
    console.error('Error sending order status email:', error);
    return { success: false, error: error.message };
  }
}

