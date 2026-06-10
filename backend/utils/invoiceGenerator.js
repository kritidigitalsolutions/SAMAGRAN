import PDFDocument from "pdfkit";

/**
 * Generates an invoice PDF using pdfkit and pipes it to the provided stream.
 * 
 * @param {object} order - Mongoose Order document (should have populated items.product and user)
 * @param {WritableStream} stream - Target stream (e.g., res)
 */
export const generateInvoicePdf = (order, stream) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  doc.pipe(stream);

  // 1. Header Section
  doc.fillColor("#8B1E3F")
     .fontSize(24)
     .text("Samagran", 50, 50, { bold: true });
     
  doc.fillColor("#6b7280")
     .fontSize(10)
     .text("support@samagran.com", 50, 80)
     .text("www.samagran.com", 50, 95);

  doc.fillColor("#2f1618")
     .fontSize(28)
     .text("INVOICE", 380, 50, { align: "right" });

  const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const shortId = (id) => String(id).slice(-8).toUpperCase();
  const buildInvoiceNumber = (order) => {
    const d = new Date(order.createdAt || Date.now());
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `INV-${ymd}-${shortId(order._id)}`;
  };
  const invoiceNumber = buildInvoiceNumber(order);
  const dueDate = new Date(order.createdAt || Date.now());
  dueDate.setDate(dueDate.getDate() + 30);

  doc.fillColor("#374151")
     .fontSize(10)
     .text(`Invoice #: ${invoiceNumber}`, 380, 90, { align: "right" })
     .text(`Date: ${fmtDate(order.createdAt)}`, 380, 105, { align: "right" })
     .text(`Due Date: ${fmtDate(dueDate)}`, 380, 120, { align: "right" });

  // Divider line
  doc.strokeColor("#8B1E3F")
     .lineWidth(2)
     .opacity(0.5)
     .moveTo(50, 145)
     .lineTo(550, 145)
     .stroke()
     .opacity(1); // restore opacity

  // 2. Bill To + Order Details Section
  doc.fillColor("#8B1E3F")
     .fontSize(11)
     .text("BILL TO:", 50, 170, { bold: true });

  const customer = order.user?.name || order.address?.name || "N/A";
  const email = order.user?.email || "";
  const phone = order.user?.phone || order.address?.phone || "";
  const address = [order.address?.fullAddress, order.address?.city, order.address?.state, order.address?.pincode].filter(Boolean).join(", ");

  doc.fillColor("#1a1a1a")
     .fontSize(12)
     .text(customer, 50, 190, { bold: true });

  let billToY = 210;
  if (email) {
    doc.fillColor("#6b7280").fontSize(10).text(email, 50, billToY);
    billToY += 15;
  }
  if (phone) {
    doc.fillColor("#6b7280").fontSize(10).text(phone, 50, billToY);
    billToY += 15;
  }
  if (address) {
    doc.fillColor("#6b7280").fontSize(10).text(address, 50, billToY, { width: 220 });
  }

  doc.fillColor("#8B1E3F")
     .fontSize(11)
     .text("ORDER DETAILS:", 300, 170, { bold: true });

  doc.fillColor("#6b7280")
     .fontSize(10)
     .text("Order ID:", 300, 190)
     .text("Order Date:", 300, 205)
     .text("Payment Method:", 300, 220)
     .text("Payment Status:", 300, 235)
     .text("Order Status:", 300, 250);

  doc.fillColor("#2f1618")
     .fontSize(10)
     .text(String(order._id), 400, 190, { bold: true })
     .text(fmtDate(order.createdAt), 400, 205, { bold: true })
     .text(order.paymentMethod || "COD", 400, 220, { bold: true })
     .text(order.paymentStatus || "Pending", 400, 235, { bold: true })
     .text(order.orderStatus || "Placed", 400, 250, { bold: true });

  // 3. Items Table Header
  const tableTop = 300;
  doc.rect(50, tableTop, 500, 25)
     .fill("#8B1E3F");

  doc.fillColor("#ffffff")
     .fontSize(10)
     .text("Item Description", 60, tableTop + 7, { bold: true })
     .text("Qty", 350, tableTop + 7, { width: 50, align: "center", bold: true })
     .text("Unit Price", 400, tableTop + 7, { width: 70, align: "right", bold: true })
     .text("Total", 480, tableTop + 7, { width: 60, align: "right", bold: true });

  // Items Table Rows
  let y = tableTop + 25;
  const items = order.items || [];
  const fmtM = (v) => `Rs ${Number(v || 0).toFixed(2)}`;

  items.forEach((item, idx) => {
    // Alternate row bg
    if (idx % 2 !== 0) {
      doc.rect(50, y, 500, 22)
         .fill("#fdf8f2");
    }

    const p = item.product;
    const name = p ? (p.title || p.name || p.kitName || item.productType || "Product") : (item.productType || "Product");

    doc.fillColor("#8B1E3F")
       .fontSize(10)
       .text(name, 60, y + 6);

    doc.fillColor("#4b5563")
       .text(String(item.quantity || 1), 350, y + 6, { width: 50, align: "center" })
       .text(fmtM(item.price), 400, y + 6, { width: 70, align: "right" });

    doc.fillColor("#8B1E3F")
       .text(fmtM(Number(item.price || 0) * Number(item.quantity || 1)), 480, y + 6, { width: 60, align: "right", bold: true });

    y += 22;
  });

  // Draw border around table
  doc.rect(50, tableTop, 500, y - tableTop)
     .strokeColor("#e5e7eb")
     .lineWidth(1)
     .stroke();

  // 4. Summary / Totals
  const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
  const deliveryFee = Number(order.amountBreakup?.deliveryFee || 0);
  const discount = Number(order.amountBreakup?.couponDiscount || 0) + Number(order.amountBreakup?.offerDiscount || 0);
  const total = Number(order.totalAmount || (subtotal + deliveryFee - discount));

  let summaryY = y + 15;

  doc.fillColor("#6b7280")
     .fontSize(10)
     .text("Subtotal:", 350, summaryY)
     .text("Delivery Fee:", 350, summaryY + 15);

  doc.fillColor("#8B1E3F")
     .fontSize(10)
     .text(fmtM(subtotal), 470, summaryY, { width: 70, align: "right", bold: true })
     .text(fmtM(deliveryFee), 470, summaryY + 15, { width: 70, align: "right", bold: true });

  if (discount > 0) {
    doc.fillColor("#6b7280").text("Discount:", 350, summaryY + 30);
    doc.fillColor("#16a34a").text(`-${fmtM(discount)}`, 470, summaryY + 30, { width: 70, align: "right", bold: true });
    summaryY += 15;
  }

  // Divider
  doc.strokeColor("#e5e7eb")
     .lineWidth(1)
     .moveTo(350, summaryY + 32)
     .lineTo(540, summaryY + 32)
     .stroke();

  doc.fillColor("#2f1618")
     .fontSize(12)
     .text("Total:", 350, summaryY + 42, { bold: true });

  doc.fillColor("#8B1E3F")
     .fontSize(12)
     .text(fmtM(total), 470, summaryY + 42, { width: 70, align: "right", bold: true });

  // 5. Notes & Terms
  const footerY = Math.max(summaryY + 80, 680);
  
  // Divider
  doc.strokeColor("#8B1E3F")
     .lineWidth(1)
     .opacity(0.3)
     .moveTo(50, footerY)
     .lineTo(550, footerY)
     .stroke()
     .opacity(1);

  doc.fillColor("#8B1E3F")
     .fontSize(9)
     .text("Notes:", 50, footerY + 10, { bold: true })
     .text("Terms & Conditions:", 300, footerY + 10, { bold: true });

  doc.fillColor("#6b7280")
     .fontSize(8)
     .text("Thank you for your business!", 50, footerY + 25)
     .text("Payment is due within 30 days.", 300, footerY + 25);

  doc.end();
};
