export interface BrandingConfig {
  name: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  emailFooter?: string;
  website?: string;
}

export function wrapBaseLayout(content: string, branding: BrandingConfig): string {
  const primary = branding.primaryColor || "#6366f1";
  const secondary = branding.secondaryColor || "#10b981";
  const footerText = branding.emailFooter || `Thank you for choosing ${branding.name}!`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #cbd5e1; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #334155; }
    .header { background: ${primary}; padding: 36px 24px; text-align: center; color: #ffffff; }
    .logo { max-height: 55px; margin-bottom: 12px; border-radius: 8px; }
    .restaurant-name { font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .content { padding: 36px 32px; line-height: 1.6; font-size: 15px; background-color: #1e293b; }
    .footer { background: #0f172a; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
    .btn { display: inline-block; padding: 12px 32px; background: ${secondary}; color: #ffffff !important; font-weight: bold; text-decoration: none; border-radius: 10px; margin: 20px 0; transition: opacity 0.2s; text-align: center; }
    .btn:hover { opacity: 0.9; }
    h2 { color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; }
    p { margin-top: 0; margin-bottom: 16px; color: #94a3b8; }
    .card { background: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin: 20px 0; }
    a { color: ${secondary}; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${branding.logoUrl ? `<img src="${branding.logoUrl}" class="logo" alt="${branding.name}">` : ""}
      <div class="restaurant-name">${branding.name}</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0; font-weight: 600; color: #64748b;">${footerText}</p>
      ${branding.website ? `<p style="margin: 6px 0 0 0;"><a href="${branding.website}">${branding.website}</a></p>` : ""}
      <p style="font-size: 10px; margin-top: 16px; color: #475569; letter-spacing: 0.5px;">POWERED BY RESTAURANT OS</p>
    </div>
  </div>
</body>
</html>
  `;
}

// 1. Owner Welcome Template
export function getOwnerWelcomeTemplate(ownerName: string, branding: BrandingConfig): string {
  const content = `
    <h2>Welcome to your Control Panel!</h2>
    <p>Hi ${ownerName},</p>
    <p>Your subscription is active and your platform is ready to launch. You can now configure your menu items, layout your table QR codes, and onboarding your staff team.</p>
    <div class="card">
      <p style="margin-bottom: 8px;"><strong>Getting Started Guide:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #94a3b8;">
        <li>Go to your settings and verify your business location.</li>
        <li>Onboard categories and menu options.</li>
        <li>Print your interactive smart Table QR codes.</li>
      </ul>
    </div>
  `;
  return wrapBaseLayout(content, branding);
}

// 2. Owner Verify Email Template
export function getOwnerVerifyEmailTemplate(ownerName: string, verifyLink: string, branding: BrandingConfig): string {
  const content = `
    <h2>Verify Your Email Address</h2>
    <p>Hi ${ownerName},</p>
    <p>Thank you for registering. Please verify your email address to activate your platform dashboard. Click the secure link below to proceed:</p>
    <div style="text-align: center;">
      <a href="${verifyLink}" class="btn" target="_blank">Verify Email Address</a>
    </div>
    <p style="font-size: 12px; color: #475569; margin-top: 15px;">This verification link will expire in 24 hours.</p>
  `;
  return wrapBaseLayout(content, branding);
}

// 3. Owner Password Reset Template
export function getOwnerPasswordResetTemplate(ownerName: string, resetLink: string, branding: BrandingConfig): string {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${ownerName},</p>
    <p>We received a request to reset your Operator Panel password. Click the secure link below to choose a new password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
    </div>
    <p style="font-size: 12px; color: #475569; margin-top: 15px;">If you did not request this, please ignore this email. This link expires in 30 minutes.</p>
  `;
  return wrapBaseLayout(content, branding);
}

// 4. Customer Invoice / Receipt Template
export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  orderNumber: string;
  tableNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  dateTime: string;
}

export function getCustomerInvoiceTemplate(customerName: string, invoice: InvoiceDetails, branding: BrandingConfig): string {
  const itemsHtml = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #334155; color: #cbd5e1;">${item.name} x ${item.quantity}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #334155; text-align: right; color: #cbd5e1;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const content = `
    <h2>Thank You for Your Order!</h2>
    <p>Hi ${customerName || "Customer"},</p>
    <p>Here is your branded receipt for your visit at <strong>${branding.name}</strong>.</p>
    
    <div class="card" style="padding: 15px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #94a3b8;">
        <tr>
          <td><strong>Invoice #:</strong> ${invoice.invoiceNumber}</td>
          <td style="text-align: right;"><strong>Date/Time:</strong> ${invoice.dateTime}</td>
        </tr>
        <tr>
          <td><strong>Order #:</strong> ${invoice.orderNumber}</td>
          <td style="text-align: right;"><strong>Table #:</strong> ${invoice.tableNumber}</td>
        </tr>
      </table>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="border-bottom: 2px solid #334155; text-align: left; font-size: 13px; color: #94a3b8;">
          <th style="padding-bottom: 8px;">Item Description</th>
          <th style="padding-bottom: 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="width: 100%; text-align: right; font-size: 14px; line-height: 1.8; color: #cbd5e1;">
      <table style="width: 60%; margin-left: 40%; border-collapse: collapse;">
        <tr>
          <td style="color: #94a3b8;">Subtotal:</td>
          <td>₹${invoice.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">GST/VAT:</td>
          <td>₹${invoice.tax.toFixed(2)}</td>
        </tr>
        ${
          invoice.discount > 0
            ? `<tr><td style="color: #f43f5e;">Discount:</td><td style="color: #f43f5e;">-₹${invoice.discount.toFixed(2)}</td></tr>`
            : ""
        }
        <tr style="font-size: 18px; font-weight: bold; border-top: 2px solid #334155;">
          <td style="padding-top: 10px; color: #ffffff;">Total Paid:</td>
          <td style="padding-top: 10px; color: #ffffff;">₹${invoice.total.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="card" style="text-align: center; padding: 12px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px;">Payment Method: <strong>${invoice.paymentMethod}</strong></p>
    </div>
  `;
  return wrapBaseLayout(content, branding);
}

// 5. Customer Order Confirmation Template
export function getCustomerOrderConfirmationTemplate(orderNumber: string, tableNumber: string, itemsCount: number, branding: BrandingConfig): string {
  const content = `
    <h2>Your Order is Confirmed</h2>
    <p>We have successfully received your order at <strong>${branding.name}</strong>.</p>
    <div class="card">
      <p style="margin-bottom: 8px;"><strong>Order summary details:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #94a3b8;">
        <li>Order Number: <strong>${orderNumber}</strong></li>
        <li>Table Number: <strong>${tableNumber}</strong></li>
        <li>Total unique items: <strong>${itemsCount}</strong></li>
      </ul>
    </div>
    <p>Our kitchen staff is actively preparing your items. You will receive updates directly on your mobile table session view.</p>
  `;
  return wrapBaseLayout(content, branding);
}

// 6. Super Admin New Owner Created
export function getSuperAdminNewOwnerTemplate(restaurantName: string, ownerEmail: string, ownerName: string, branding: BrandingConfig): string {
  const content = `
    <h2>New SaaS Registration</h2>
    <p>A new restaurant owner has registered on the platform:</p>
    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Restaurant:</td>
          <td style="color: #ffffff;"><strong>${restaurantName}</strong></td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Owner Name:</td>
          <td style="color: #ffffff;">${ownerName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Owner Email:</td>
          <td style="color: #ffffff;">${ownerEmail}</td>
        </tr>
      </table>
    </div>
    <p>A verification email has been sent to the owner's address. You can review this tenant in the Operator Control Center.</p>
  `;
  return wrapBaseLayout(content, branding);
}

// 7. Super Admin Subscription Activated
export function getSuperAdminSubscriptionTemplate(restaurantName: string, planName: string, value: string, branding: BrandingConfig): string {
  const content = `
    <h2>SaaS Subscription Activated</h2>
    <p>A billing transaction has completed for the following restaurant:</p>
    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Restaurant:</td>
          <td style="color: #ffffff;"><strong>${restaurantName}</strong></td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Plan Active:</td>
          <td style="color: #ffffff;">${planName}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Billing amount:</td>
          <td style="color: #ffffff;">₹${value}/month</td>
        </tr>
      </table>
    </div>
  `;
  return wrapBaseLayout(content, branding);
}

// 8. Super Admin Trial Ending
export function getSuperAdminTrialEndingTemplate(restaurantName: string, daysLeft: number, endDate: string, branding: BrandingConfig): string {
  const content = `
    <h2>SaaS Trial Subscription Expiring</h2>
    <p>A restaurant's trial subscription is coming to an end:</p>
    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Restaurant:</td>
          <td style="color: #ffffff;"><strong>${restaurantName}</strong></td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Days Left:</td>
          <td style="color: #f43f5e; font-weight: bold;">${daysLeft} days</td>
        </tr>
        <tr>
          <td style="color: #94a3b8; padding: 4px 0;">Expiration date:</td>
          <td style="color: #ffffff;">${endDate}</td>
        </tr>
      </table>
    </div>
  `;
  return wrapBaseLayout(content, branding);
}
