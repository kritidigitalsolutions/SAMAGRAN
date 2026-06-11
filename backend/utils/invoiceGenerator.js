import PDFDocument from "pdfkit";

/**
 * Converts a number into Indian Rupees words.
 */
function formatRupeesInWords(amount) {
  const parts = Number(amount || 0).toFixed(2).split(".");
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n, suffix) => {
    let str = "";
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    if (n) {
      str += suffix;
    }
    return str;
  };

  const convertGroup = (num) => {
    let out = "";
    out += numToWords(Math.floor(num / 10000000), "Crore ");
    out += numToWords(Math.floor((num / 100000) % 100), "Lakh ");
    out += numToWords(Math.floor((num / 1000) % 100), "Thousand ");
    out += numToWords(Math.floor((num / 100) % 10), "Hundred ");
    
    const rem = num % 100;
    if (rem > 0) {
      if (num > 100) out += "and ";
      if (rem > 19) {
        out += b[Math.floor(rem / 10)] + " " + a[rem % 10];
      } else {
        out += a[rem];
      }
    }
    return out.trim();
  };

  let rupeesStr = rupees > 0 ? convertGroup(rupees) + " Rupees" : "";
  let paiseStr = paise > 0 ? convertGroup(paise) + " Paisa" : "";

  if (rupeesStr && paiseStr) {
    return `${rupeesStr} and ${paiseStr} Only`;
  } else if (rupeesStr) {
    return `${rupeesStr} Only`;
  } else if (paiseStr) {
    return `${paiseStr} Only`;
  }
  return "Zero Rupees Only";
}

/**
 * Draws a clean vector mock QR code.
 */
function drawMockQrCode(doc, x, y, size) {
  doc.save();
  // Border
  doc.rect(x, y, size, size).strokeColor("#e5e7eb").lineWidth(1).stroke();
  
  // Finder pattern top-left
  doc.rect(x + 2, y + 2, 12, 12).fillColor("#1a1a1a").fill();
  doc.rect(x + 4, y + 4, 8, 8).fillColor("#ffffff").fill();
  doc.rect(x + 6, y + 6, 4, 4).fillColor("#1a1a1a").fill();
  
  // Finder pattern top-right
  doc.rect(x + size - 14, y + 2, 12, 12).fillColor("#1a1a1a").fill();
  doc.rect(x + size - 12, y + 4, 8, 8).fillColor("#ffffff").fill();
  doc.rect(x + size - 10, y + 6, 4, 4).fillColor("#1a1a1a").fill();
  
  // Finder pattern bottom-left
  doc.rect(x + 2, y + size - 14, 12, 12).fillColor("#1a1a1a").fill();
  doc.rect(x + 4, y + size - 12, 8, 8).fillColor("#ffffff").fill();
  doc.rect(x + 6, y + size - 10, 4, 4).fillColor("#1a1a1a").fill();

  // Draw simulated pixels
  doc.fillColor("#1a1a1a");
  const pixels = [
    [18, 4], [22, 6], [16, 10], [20, 12], [24, 8],
    [4, 18], [6, 22], [10, 16], [12, 20], [8, 24],
    [16, 16], [18, 20], [22, 18], [20, 24], [24, 22],
    [14, 14], [15, 25], [25, 15], [26, 26]
  ];
  pixels.forEach(([px, py]) => {
    const sx = x + (px / 30) * size;
    const sy = y + (py / 30) * size;
    const sSize = size / 15;
    doc.rect(sx, sy, sSize, sSize).fill();
  });
  doc.restore();
}

/**
 * Generates an invoice PDF using pdfkit and pipes it to the provided stream.
 * 
 * @param {object} order - Mongoose Order document (should have populated items.product, user, and vendorId)
 * @param {WritableStream} stream - Target stream (e.g., res)
 */
export const generateInvoicePdf = (order, stream) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const shortId = (id) => String(id).slice(-8).toUpperCase();
  const buildInvoiceNumber = (order) => {
    const d = new Date(order.createdAt || Date.now());
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `INV-${ymd}-${shortId(order._id)}`;
  };
  const invoiceNumber = buildInvoiceNumber(order);

  // 1. Header Section
  // Logo Circle (Maroon theme)
  doc.save();
  doc.circle(58, 60, 18)
     .fillColor("#8B1E3F")
     .fill();
  
  doc.fillColor("#ffffff")
     .font("Helvetica-Bold")
     .fontSize(16)
     .text("S", 52, 53);
  
  doc.fillColor("#8B1E3F")
     .fontSize(22)
     .text("Samagran", 84, 46, { bold: true });
     
  doc.fillColor("#6b7280")
     .fontSize(9)
     .font("Helvetica")
     .text("Marketplace Portal", 84, 68);

  // Tax Invoice Title on Right
  doc.fillColor("#2f1618")
     .fontSize(22)
     .font("Helvetica-Bold")
     .text("Tax Invoice", 350, 48, { align: "right" });
  doc.restore();

  // Divider Line
  doc.strokeColor("#e5e7eb")
     .lineWidth(1)
     .moveTo(40, 92)
     .lineTo(555, 92)
     .stroke();

  // 2. Top Box: Seller Details & QR Code/Invoice ID
  const sellerY = 100;
  doc.save();
  // Draw outer box
  doc.rect(40, sellerY, 515, 115)
     .strokeColor("#d1d5db")
     .lineWidth(1)
     .stroke();

  // Vertical Separator
  doc.moveTo(330, sellerY)
     .lineTo(330, sellerY + 115)
     .strokeColor("#d1d5db")
     .stroke();

  // Seller Info (Left Column)
  const vendor = order.vendorId || {};
  const sellerName = vendor.businessName || vendor.name || "Samagran Ventures LLP";
  const sellerAddress = [
    vendor.address?.line1,
    vendor.address?.line2,
    vendor.address?.city,
    vendor.address?.state,
    vendor.address?.pincode
  ].filter(Boolean).join(", ") || "Godown, Patlipada, Near Ramnath Tabela, Thane (M.Corp)-400607, Maharashtra";
  
  const sellerGstin = vendor.gstin || "27AACFY8913A1Z8";
  const sellerFssai = vendor.fssai || "13323999000008";
  const sellerCin = vendor.cin || "AAZ-3294";
  const sellerPan = vendor.pan || "AACFY8913A";
  const sellerEmail = vendor.email || "support@samagran.com";
  const sellerPhone = vendor.phone || "+91 9876543210";

  doc.fillColor("#8B1E3F").font("Helvetica-Bold").fontSize(9.5).text("Sold By / Seller:", 50, sellerY + 8);
  doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(10.5).text(sellerName, 50, sellerY + 22, { width: 270, height: 14, ellipsis: true });
  doc.fillColor("#4b5563").font("Helvetica").fontSize(8).text(sellerAddress, 50, sellerY + 37, { width: 270, height: 26, ellipsis: true });

  // Seller tax credentials
  doc.fillColor("#374151").fontSize(7.5);
  doc.text(`GSTIN: ${sellerGstin}  |  PAN: ${sellerPan}`, 50, sellerY + 66);
  doc.text(`CIN: ${sellerCin}  |  FSSAI: ${sellerFssai}`, 50, sellerY + 77);
  doc.text(`Email: ${sellerEmail}  |  Contact: ${sellerPhone}`, 50, sellerY + 88);

  // Invoice Details & QR Code (Right Column)
  drawMockQrCode(doc, 480, sellerY + 10, 60);

  doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8.5);
  doc.text(`Invoice No:`, 340, sellerY + 15);
  doc.fillColor("#1a1a1a").font("Helvetica").fontSize(8.5);
  doc.text(invoiceNumber, 340, sellerY + 26);

  doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8);
  doc.text("Reverse Charge Payable:", 340, sellerY + 45);
  doc.font("Helvetica").text("No", 340, sellerY + 55);

  doc.font("Helvetica-Bold").text("Marketplace Platform:", 340, sellerY + 72);
  doc.font("Helvetica").text("Samagran Marketplace", 340, sellerY + 82);
  doc.restore();

  // 3. Middle Box: Customer Details & Order details
  const customerY = 222;
  doc.save();
  // Draw outer box
  doc.rect(40, customerY, 515, 95)
     .strokeColor("#d1d5db")
     .lineWidth(1)
     .stroke();

  // Vertical Separator
  doc.moveTo(330, customerY)
     .lineTo(330, customerY + 95)
     .strokeColor("#d1d5db")
     .stroke();

  // Customer Details (Left Column)
  const customerName = order.user?.name || order.address?.name || "Customer";
  const customerAddress = [
    order.address?.fullAddress,
    order.address?.city,
    order.address?.state,
    order.address?.pincode
  ].filter(Boolean).join(", ") || "Address not provided";
  const customerPhone = order.user?.phone || order.address?.phone || "—";
  const customerEmail = order.user?.email || "—";

  doc.fillColor("#8B1E3F").font("Helvetica-Bold").fontSize(9.5).text("Invoice To:", 50, customerY + 8);
  doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(10.5).text(customerName, 50, customerY + 22, { width: 270, height: 14, ellipsis: true });
  doc.fillColor("#4b5563").font("Helvetica").fontSize(8).text(customerAddress, 50, customerY + 36, { width: 270, height: 26, ellipsis: true });
  
  doc.fillColor("#374151").fontSize(7.5);
  doc.text(`Phone: ${customerPhone}  |  Email: ${customerEmail}`, 50, customerY + 68);

  // Order details (Right Column)
  doc.fillColor("#374151").font("Helvetica-Bold").fontSize(8);
  
  doc.text("Order ID:", 340, customerY + 12);
  doc.font("Helvetica").text(String(order._id), 425, customerY + 12);

  doc.font("Helvetica-Bold").text("Invoice Date:", 340, customerY + 27);
  doc.font("Helvetica").text(fmtDate(order.createdAt), 425, customerY + 27);

  doc.font("Helvetica-Bold").text("Place of Supply:", 340, customerY + 42);
  doc.font("Helvetica").text(order.address?.state || "Maharashtra", 425, customerY + 42);

  doc.font("Helvetica-Bold").text("Payment Method:", 340, customerY + 57);
  doc.font("Helvetica").text(order.paymentMethod || "COD", 425, customerY + 57);
  
  doc.font("Helvetica-Bold").text("Payment Status:", 340, customerY + 72);
  doc.font("Helvetica-Bold").fillColor(order.paymentStatus === "Paid" ? "#16a34a" : "#d97706").text(order.paymentStatus || "Pending", 425, customerY + 72);
  doc.restore();

  // 4. Product Table Header
  const tableY = 325;
  doc.save();
  // Draw header fill
  doc.rect(40, tableY, 515, 20)
     .fill("#8B1E3F");

  // Columns coordinates
  const cols = [
    { name: "Sr. No.", x: 40, w: 25, align: "center" },
    { name: "SKU/UPC", x: 65, w: 50, align: "left" },
    { name: "Item Description", x: 115, w: 115, align: "left" },
    { name: "HSN/SAC", x: 230, w: 45, align: "left" },
    { name: "MRP", x: 275, w: 40, align: "right" },
    { name: "Discount", x: 315, w: 40, align: "right" },
    { name: "Qty", x: 355, w: 25, align: "center" },
    { name: "Taxable", x: 380, w: 50, align: "right" },
    { name: "GST (%)", x: 430, w: 25, align: "center" },
    { name: "GST Amt", x: 455, w: 50, align: "right" },
    { name: "Total", x: 505, w: 50, align: "right" }
  ];

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
  cols.forEach(c => {
    doc.text(c.name, c.x, tableY + 6, { width: c.w, align: c.align });
  });
  doc.restore();

  // Product Table Rows
  let y = tableY + 20;
  const items = order.items || [];
  
  let totalTaxableValue = 0;
  let totalGstAmount = 0;
  let totalMRP = 0;
  let totalDiscountVal = 0;

  items.forEach((item, idx) => {
    doc.save();
    // Alternating bg
    if (idx % 2 !== 0) {
      doc.rect(40, y, 515, 24)
         .fill("#fdf8f2");
    }

    const p = item.product;
    const nameStr = p ? (p.title || p.name || p.kitName || item.productType || "Product") : (item.productType || "Product");
    const skuStr = p?.itemCode || (p?.slug ? `KIT-${p.slug.toUpperCase()}` : `PROD-${String(item._id).slice(-6).toUpperCase()}`);
    const hsnStr = p?.compliance?.hsnCode || "—";
    
    const unitMRP = p?.pricing?.mrp || item.price || 0;
    const unitPrice = item.price || 0;
    const unitDiscount = Math.max(0, unitMRP - unitPrice);
    const qty = item.quantity || 1;
    const totalAmount = unitPrice * qty;
    const gstPercent = p?.pricing?.gstPercent || 18;
    const taxableValue = totalAmount / (1 + gstPercent / 100);
    const gstAmount = totalAmount - taxableValue;

    // Add to totals
    totalTaxableValue += taxableValue;
    totalGstAmount += gstAmount;
    totalMRP += unitMRP * qty;
    totalDiscountVal += unitDiscount * qty;

    doc.fillColor("#374151").font("Helvetica").fontSize(7.5);
    
    // Sr No
    doc.text(String(idx + 1), cols[0].x, y + 8, { width: cols[0].w, align: cols[0].align });
    // SKU
    doc.text(skuStr, cols[1].x, y + 8, { width: cols[1].w, align: cols[1].align, ellipsis: true });
    // Description
    doc.fillColor("#8B1E3F").font("Helvetica-Bold");
    doc.text(nameStr, cols[2].x, y + 8, { width: cols[2].w, align: cols[2].align, height: 16, ellipsis: true });
    doc.fillColor("#374151").font("Helvetica");
    // HSN
    doc.text(hsnStr, cols[3].x, y + 8, { width: cols[3].w, align: cols[3].align });
    // MRP
    doc.text(unitMRP.toFixed(2), cols[4].x, y + 8, { width: cols[4].w, align: cols[4].align });
    // Discount
    doc.text(unitDiscount.toFixed(2), cols[5].x, y + 8, { width: cols[5].w, align: cols[5].align });
    // Qty
    doc.text(String(qty), cols[6].x, y + 8, { width: cols[6].w, align: cols[6].align });
    // Taxable
    doc.text(taxableValue.toFixed(2), cols[7].x, y + 8, { width: cols[7].w, align: cols[7].align });
    // GST (%)
    doc.text(`${gstPercent}%`, cols[8].x, y + 8, { width: cols[8].w, align: cols[8].align });
    // GST Amt
    doc.text(gstAmount.toFixed(2), cols[9].x, y + 8, { width: cols[9].w, align: cols[9].align });
    // Total
    doc.font("Helvetica-Bold").fillColor("#8B1E3F");
    doc.text(totalAmount.toFixed(2), cols[10].x, y + 8, { width: cols[10].w, align: cols[10].align });

    y += 24;
    doc.restore();
  });

  // Draw table borders
  doc.save();
  doc.rect(40, tableY, 515, y - tableY)
     .strokeColor("#d1d5db")
     .lineWidth(1)
     .stroke();
  doc.restore();

  // 5. Totals & Amount in Words
  const deliveryFee = Number(order.amountBreakup?.deliveryFee || 0);
  const couponDiscount = Number(order.amountBreakup?.couponDiscount || 0);
  const offerDiscount = Number(order.amountBreakup?.offerDiscount || 0);
  const orderLevelDiscount = couponDiscount + offerDiscount;

  // Final total discount is product-level discount + order-level discount
  const grandTotalDiscount = totalDiscountVal + orderLevelDiscount;
  const grandTotal = Number(order.totalAmount || (totalTaxableValue + totalGstAmount + deliveryFee - orderLevelDiscount));

  let totalsY = y + 12;
  doc.save();

  // Left Side: Amount in Words
  doc.fillColor("#8B1E3F").font("Helvetica-Bold").fontSize(8.5).text("Amount in Words:", 45, totalsY);
  doc.fillColor("#1a1a1a").font("Helvetica-Oblique").fontSize(8).text(formatRupeesInWords(grandTotal), 45, totalsY + 12, { width: 250 });

  // Right Side: Totals breakdown
  const rightX = 330;
  const valX = 490;
  const valW = 60;
  doc.fillColor("#4b5563").font("Helvetica").fontSize(8);
  
  doc.text("Subtotal (MRP Total):", rightX, totalsY);
  doc.text(totalMRP.toFixed(2), valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  doc.text("Total Product Discount:", rightX, totalsY);
  doc.text(`-${totalDiscountVal.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  if (orderLevelDiscount > 0) {
    doc.text("Coupon/Offer Discount:", rightX, totalsY);
    doc.text(`-${orderLevelDiscount.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
    totalsY += 14;
  }

  doc.text("Total Taxable Value:", rightX, totalsY);
  doc.text(totalTaxableValue.toFixed(2), valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  doc.text("Total GST Amount:", rightX, totalsY);
  doc.text(totalGstAmount.toFixed(2), valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  doc.text("Shipping & Delivery Charges:", rightX, totalsY);
  doc.text(deliveryFee.toFixed(2), valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  // Divider line
  doc.strokeColor("#e5e7eb")
     .lineWidth(1)
     .moveTo(rightX, totalsY + 2)
     .lineTo(550, totalsY + 2)
     .stroke();
  totalsY += 8;

  doc.fillColor("#2f1618").font("Helvetica-Bold").fontSize(11).text("Grand Total:", rightX, totalsY);
  doc.fillColor("#8B1E3F").text(`Rs ${grandTotal.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });

  doc.restore();

  // 6. Footer Box (Corporate Office & Signatory)
  // Standardize Y to at least Y = 680 to push it down near the bottom of A4
  const footerY = Math.max(totalsY + 45, 660);
  
  doc.save();
  // Draw outer box
  doc.rect(40, footerY, 515, 60)
     .strokeColor("#d1d5db")
     .lineWidth(1)
     .stroke();

  // Corporate Office (Left side of footer box)
  doc.fillColor("#8B1E3F").font("Helvetica-Bold").fontSize(8.5).text("Samagran Ventures Private Limited (Corporate Office)", 48, footerY + 8);
  doc.fillColor("#4b5563").font("Helvetica").fontSize(7).text("Reg. Address: godown, Patlipada, Hiranandani, Thane (W)-400607, MH, India", 48, footerY + 20);
  doc.text("CIN: U74140MH2025PTC055568 | PAN: AAFCS8024E | FSSAI: 10018064001545", 48, footerY + 31);
  doc.text("Customer Support: support@samagran.com | +91-9988776655", 48, footerY + 42);

  // Signatory (Right side of footer box)
  doc.moveTo(380, footerY)
     .lineTo(380, footerY + 60)
     .strokeColor("#d1d5db")
     .stroke();

  // Draw cursive signature text
  doc.fillColor("#6b7280").font("Courier-BoldOblique").fontSize(12).text("Anil Sharma", 400, footerY + 15, { width: 140, align: "center" });
  doc.fillColor("#374151").font("Helvetica-Bold").fontSize(7.5).text("Authorized Signatory", 400, footerY + 42, { width: 140, align: "center" });
  doc.restore();

  // Terms & Conditions below footer box
  doc.save();
  const termsY = footerY + 68;
  doc.fillColor("#2f1618").font("Helvetica-Bold").fontSize(8.5).text("Terms & Conditions:", 40, termsY);
  doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text("1. All items listed belong to their respective registered sellers on the Samagran Marketplace.", 40, termsY + 12);
  doc.text("2. Tax rates are applied in accordance with GST compliance guidelines as provided by the sellers.", 40, termsY + 21);
  doc.text("3. For any customer support or refund queries, contact the support email or chat within 30 days of the purchase date.", 40, termsY + 30);
  doc.restore();

  doc.end();
};
