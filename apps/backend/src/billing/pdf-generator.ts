import * as PDFDocument from "pdfkit";

export interface InvoicePdfItem {
  name: string;
  quantity: number;
  price: number;
}

export interface InvoicePdfDetails {
  invoiceNumber: string;
  orderNumber: string;
  tableNumber: string;
  customerName?: string;
  items: InvoicePdfItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  dateTime: string;
}

export interface BrandingPdfConfig {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string;
  phone?: string;
  email?: string;
  invoiceFooter?: string;
}

export async function generateInvoicePdf(
  invoice: InvoicePdfDetails,
  branding: BrandingPdfConfig
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const primaryColor = branding.primaryColor || "#6366f1";

    // 1. Draw Branding Top Stripe
    doc.rect(0, 0, 595.28, 15).fill(primaryColor);

    // 2. Title & Business Details
    doc.fillColor("#1e293b")
       .font("Helvetica-Bold")
       .fontSize(24)
       .text(branding.name, 50, 40);

    doc.fontSize(10)
       .font("Helvetica")
       .fillColor("#64748b")
       .text(branding.address || "", 50, 70)
       .text(`Phone: ${branding.phone || ""} | Email: ${branding.email || ""}`, 50, 85);

    // 3. Invoice label & details
    doc.fillColor("#1e293b")
       .font("Helvetica-Bold")
       .fontSize(18)
       .text("INVOICE", 400, 40, { align: "right" });

    doc.fontSize(9)
       .font("Helvetica")
       .fillColor("#64748b")
       .text(`Invoice Number: ${invoice.invoiceNumber}`, 400, 65, { align: "right" })
       .text(`Order Number: ${invoice.orderNumber}`, 400, 80, { align: "right" })
       .text(`Date: ${invoice.dateTime}`, 400, 95, { align: "right" });

    // 4. Line separator
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor("#e2e8f0").stroke();

    // 5. Bill To Info
    doc.fillColor("#1e293b")
       .font("Helvetica-Bold")
       .fontSize(10)
       .text("BILL TO:", 50, 140);

    doc.font("Helvetica")
       .fillColor("#334155")
       .text(invoice.customerName || "Valued Customer", 50, 155)
       .text(`Table Number: ${invoice.tableNumber}`, 50, 170);

    // 6. Table Header
    let y = 210;
    doc.rect(50, y, 495, 25).fill(primaryColor);
    doc.fillColor("#ffffff")
       .font("Helvetica-Bold")
       .text("Item Description", 60, y + 7)
       .text("Qty", 350, y + 7, { width: 30, align: "right" })
       .text("Price", 400, y + 7, { width: 60, align: "right" })
       .text("Total", 480, y + 7, { width: 50, align: "right" });

    y += 25;
    doc.fillColor("#334155").font("Helvetica");

    // 7. Table Body Rows
    for (const item of invoice.items) {
      if (y > 700) {
        doc.addPage();
        y = 50;
        doc.rect(50, y, 495, 25).fill(primaryColor);
        doc.fillColor("#ffffff")
           .font("Helvetica-Bold")
           .text("Item Description", 60, y + 7)
           .text("Qty", 350, y + 7, { width: 30, align: "right" })
           .text("Price", 400, y + 7, { width: 60, align: "right" })
           .text("Total", 480, y + 7, { width: 50, align: "right" });
        y += 25;
        doc.fillColor("#334155").font("Helvetica");
      }

      const itemTotal = (item.price * item.quantity).toFixed(2);
      doc.text(item.name, 60, y + 7)
         .text(item.quantity.toString(), 350, y + 7, { width: 30, align: "right" })
         .text(`₹${item.price.toFixed(2)}`, 400, y + 7, { width: 60, align: "right" })
         .text(`₹${itemTotal}`, 480, y + 7, { width: 50, align: "right" });

      doc.moveTo(50, y + 22).lineTo(545, y + 22).strokeColor("#f1f5f9").stroke();
      y += 22;
    }

    y += 15;

    // 8. Totals Column
    doc.font("Helvetica-Bold").text("Subtotal:", 320, y)
       .font("Helvetica").text(`₹${invoice.subtotal.toFixed(2)}`, 470, y, { align: "right" });

    y += 18;
    doc.font("Helvetica-Bold").text("GST/VAT:", 320, y)
       .font("Helvetica").text(`₹${invoice.tax.toFixed(2)}`, 470, y, { align: "right" });

    if (invoice.discount > 0) {
      y += 18;
      doc.font("Helvetica-Bold").fillColor("#f43f5e").text("Discount:", 320, y)
         .font("Helvetica").text(`-₹${invoice.discount.toFixed(2)}`, 470, y, { align: "right" });
    }

    y += 24;
    doc.rect(310, y - 5, 235, 30).fill("#f8fafc");
    doc.fillColor("#1e293b")
       .font("Helvetica-Bold")
       .fontSize(11)
       .text("Total Paid:", 320, y + 4)
       .text(`₹${invoice.total.toFixed(2)}`, 460, y + 4, { align: "right" });

    // 9. Invoice Footer
    doc.fontSize(9)
       .font("Helvetica")
       .fillColor("#94a3b8")
       .text(branding.invoiceFooter || "Thank you for your business!", 50, 730, {
         align: "center",
         width: 495,
       });

    doc.end();
  });
}
