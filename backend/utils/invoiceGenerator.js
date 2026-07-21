import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";

const isValEmpty = (val) => {
  if (!val) return true;
  const clean = String(val).trim();
  return clean === "" || clean === "—" || clean === "-" || clean === "null" || clean === "undefined";
};

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
 * Generates an invoice PDF using pdfkit and pipes it to the provided stream.
 * 
 * @param {object} order - Mongoose Order document (should have populated items.product, user, and vendorId)
 * @param {WritableStream} stream - Target stream (e.g., res)
 */
export const generateInvoicePdf = async (order, stream) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  // Retrieve Super Admin's corporateDetails dynamically
  let corporateDetails = {};
  try {
    const Admin = mongoose.model("Admin");
    const superAdmin = await Admin.findOne({ role: "super" }).lean();
    corporateDetails = superAdmin?.corporateDetails || {};
  } catch (err) {
    console.error("Failed to load corporateDetails in invoiceGenerator:", err);
  }

  const corp = corporateDetails || {};

  const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const shortId = (id) => String(id).slice(-8).toUpperCase();
  const buildInvoiceNumber = (order) => {
    const d = new Date(order.createdAt || Date.now());
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `INV-${ymd}-${shortId(order._id)}`;
  };
  const invoiceNumber = buildInvoiceNumber(order);

  // 1. Header Section
  // Fetch custom uploaded logo image if available
  let logoBuffer = null;
  const logoUrlToFetch = order.invoiceDetails?.logoUrl || corp.logoUrl;
  if (!isValEmpty(logoUrlToFetch)) {
    try {
      if (logoUrlToFetch.startsWith("http://") || logoUrlToFetch.startsWith("https://")) {
        const resp = await axios.get(logoUrlToFetch, { responseType: "arraybuffer", timeout: 5000 });
        logoBuffer = Buffer.from(resp.data);
      } else if (fs.existsSync(logoUrlToFetch)) {
        logoBuffer = fs.readFileSync(logoUrlToFetch);
      }
    } catch (err) {
      console.error("Failed to load corporate logo image for PDF:", err.message);
    }
  }

  const headerTitle = !isValEmpty(corp.companyName) ? corp.companyName : "Samagran";

  doc.save();
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 40, 42, { fit: [90, 40] });
      doc.fillColor("#8B1E3F")
         .fontSize(20)
         .font("Helvetica-Bold")
         .text(headerTitle, 140, 48, { width: 200, ellipsis: true });
    } catch (imgErr) {
      console.error("Failed to render logo image buffer in PDFKit:", imgErr.message);
      doc.circle(58, 60, 18).fillColor("#8B1E3F").fill();
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text("S", 52, 53);
      doc.fillColor("#8B1E3F").fontSize(22).font("Helvetica-Bold").text(headerTitle, 84, 46, { width: 250, ellipsis: true });
    }
  } else {
    doc.circle(58, 60, 18).fillColor("#8B1E3F").fill();
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text("S", 52, 53);
    doc.fillColor("#8B1E3F").fontSize(22).font("Helvetica-Bold").text(headerTitle, 84, 46, { width: 250, ellipsis: true });
  }

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

  // 2. Top Box: Seller Details & Invoice Metadata
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
  const sellerName = order.invoiceDetails?.sellerName || vendor.businessName || vendor.name || "Samagran Ventures LLP";
  const sellerAddress = order.invoiceDetails?.sellerAddress || [
    vendor.address?.line1,
    vendor.address?.line2,
    vendor.address?.city,
    vendor.address?.state,
    vendor.address?.pincode
  ].filter(Boolean).join(", ") || "Godown, Patlipada, Near Ramnath Tabela, Thane (M.Corp)-400607, Maharashtra";
  
  const sellerGstin = order.invoiceDetails?.sellerGstin || vendor.kyc?.gst || vendor.gstin || "";
  const sellerFssai = order.invoiceDetails?.sellerFssai || vendor.kyc?.fssai || vendor.fssai || "";
  const sellerCin = order.invoiceDetails?.sellerCin || vendor.kyc?.cin || vendor.cin || "";
  const sellerPan = order.invoiceDetails?.sellerPan || vendor.kyc?.pan || vendor.pan || "";
  const sellerEmail = order.invoiceDetails?.sellerEmail || vendor.email || "";
  const sellerPhone = order.invoiceDetails?.sellerPhone || vendor.phone || "";

  doc.fillColor("#8B1E3F").font("Helvetica-Bold").fontSize(9.5).text("Sold By / Seller:", 50, sellerY + 8);
  doc.fillColor("#1a1a1a").font("Helvetica-Bold").fontSize(10.5).text(sellerName, 50, sellerY + 22, { width: 270, height: 14, ellipsis: true });
  doc.fillColor("#4b5563").font("Helvetica").fontSize(8).text(sellerAddress, 50, sellerY + 37, { width: 270, height: 26, ellipsis: true });

  // Seller tax credentials
  const credentialParts = [];
  if (!isValEmpty(sellerGstin)) credentialParts.push(`GSTIN: ${sellerGstin}`);
  if (!isValEmpty(sellerPan)) credentialParts.push(`PAN: ${sellerPan}`);
  const credentialLine1 = credentialParts.join("  |  ");

  const credentialParts2 = [];
  if (!isValEmpty(sellerCin)) credentialParts2.push(`CIN: ${sellerCin}`);
  if (!isValEmpty(sellerFssai)) credentialParts2.push(`FSSAI: ${sellerFssai}`);
  const credentialLine2 = credentialParts2.join("  |  ");

  const contactParts = [];
  if (!isValEmpty(sellerEmail)) contactParts.push(`Email: ${sellerEmail}`);
  if (!isValEmpty(sellerPhone)) contactParts.push(`Contact: ${sellerPhone}`);
  const contactLine = contactParts.join("  |  ");

  let credY = sellerY + 66;
  doc.fillColor("#374151").fontSize(7.5);
  if (credentialLine1) {
    doc.text(credentialLine1, 50, credY);
    credY += 11;
  }
  if (credentialLine2) {
    doc.text(credentialLine2, 50, credY);
    credY += 11;
  }
  if (contactLine) {
    doc.text(contactLine, 50, credY);
  }

  // Invoice Details (Right Column - NO QR CODE)
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
  doc.rect(40, tableY, 515, 22)
     .fill("#8B1E3F");

  // Columns coordinates (Sum of widths = 515, matching left margin 40 to right 555)
  const cols = [
    { name: "Sr. No.", x: 40, w: 28, align: "center" },
    { name: "SKU/UPC", x: 68, w: 60, align: "left" },
    { name: "Item Description", x: 128, w: 110, align: "left" },
    { name: "HSN/SAC", x: 238, w: 42, align: "left" },
    { name: "MRP", x: 280, w: 36, align: "right" },
    { name: "Discount", x: 316, w: 38, align: "right" },
    { name: "Qty", x: 354, w: 24, align: "center" },
    { name: "Taxable", x: 378, w: 42, align: "right" },
    { name: "GST (%)", x: 420, w: 32, align: "center" },
    { name: "GST Amt", x: 452, w: 45, align: "right" },
    { name: "Total", x: 497, w: 58, align: "right" }
  ];

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
  cols.forEach(c => {
    doc.text(c.name, c.x, tableY + 7, { width: c.w, align: c.align });
  });
  doc.restore();

  // Product Table Rows
  let y = tableY + 22;
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
    const gstIncluded = p?.pricing?.priceIncludesGst ?? true;
    const gstPercent = gstIncluded ? (p?.pricing?.gstPercent || 0) : 0;
    const taxableValue = totalAmount / (1 + gstPercent / 100);
    const gstAmount = totalAmount - taxableValue;

    // Add to totals
    totalTaxableValue += taxableValue;
    totalGstAmount += gstAmount;
    totalMRP += unitMRP * qty;
    totalDiscountVal += unitDiscount * qty;

    doc.fillColor("#374151").font("Helvetica").fontSize(7);
    
    // Sr No
    doc.text(String(idx + 1), cols[0].x, y + 8, { width: cols[0].w, align: cols[0].align });
    // SKU
    doc.text(skuStr, cols[1].x, y + 8, { width: cols[1].w, align: cols[1].align, ellipsis: true });
    // Description
    doc.fillColor("#8B1E3F").font("Helvetica-Bold");
    doc.text(nameStr, cols[2].x, y + 8, { width: cols[2].w, align: cols[2].align, height: 14, ellipsis: true });
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

  // 6. Corporate Office & Signatory (Only rendered if non-empty fields exist!)
  const corpName = order.invoiceDetails?.companyName || corp.companyName || "";
  const corpAddr = order.invoiceDetails?.companyAddress || corp.address || "";
  const corpCin = order.invoiceDetails?.companyCin || corp.cin || "";
  const corpPan = order.invoiceDetails?.companyPan || corp.pan || "";
  const corpFssai = order.invoiceDetails?.companyFssai || corp.fssai || "";
  const corpEmail = order.invoiceDetails?.companyEmail || corp.email || "";
  const corpPhone = order.invoiceDetails?.companyPhone || corp.phone || "";
  const corpSignatory = order.invoiceDetails?.authorizedSignatory || corp.authorizedSignatory || "";

  const hasCorpData = !isValEmpty(corpName) || !isValEmpty(corpAddr) || !isValEmpty(corpCin) || !isValEmpty(corpPan) || !isValEmpty(corpFssai) || !isValEmpty(corpEmail) || !isValEmpty(corpPhone) || !isValEmpty(corpSignatory);

  let footerY = totalsY + 30;

  if (hasCorpData) {
    footerY = Math.max(totalsY + 35, 650);
    doc.save();
    doc.rect(40, footerY, 515, 65)
       .strokeColor("#d1d5db")
       .lineWidth(1)
       .stroke();

    let curY = footerY + 8;
    if (!isValEmpty(corpName)) {
      doc.fillColor("#8B1E3F").font("Helvetica-Bold").fontSize(8.5).text(`${corpName} (Corporate Office)`, 48, curY);
      curY += 12;
    }
    if (!isValEmpty(corpAddr)) {
      doc.fillColor("#4b5563").font("Helvetica").fontSize(7).text(`Reg. Address: ${corpAddr}`, 48, curY, { width: 320, height: 12, ellipsis: true });
      curY += 12;
    }

    const taxLineParts = [];
    if (!isValEmpty(corpCin)) taxLineParts.push(`CIN: ${corpCin}`);
    if (!isValEmpty(corpPan)) taxLineParts.push(`PAN: ${corpPan}`);
    if (!isValEmpty(corpFssai)) taxLineParts.push(`FSSAI: ${corpFssai}`);
    if (taxLineParts.length > 0) {
      doc.fillColor("#4b5563").font("Helvetica").fontSize(7).text(taxLineParts.join("  |  "), 48, curY);
      curY += 12;
    }

    const contactLineParts = [];
    if (!isValEmpty(corpEmail)) contactLineParts.push(`Customer Support: ${corpEmail}`);
    if (!isValEmpty(corpPhone)) contactLineParts.push(`Contact: ${corpPhone}`);
    if (contactLineParts.length > 0) {
      doc.fillColor("#4b5563").font("Helvetica").fontSize(7).text(contactLineParts.join("  |  "), 48, curY);
    }

    // Signatory
    if (!isValEmpty(corpSignatory)) {
      doc.moveTo(380, footerY)
         .lineTo(380, footerY + 65)
         .strokeColor("#d1d5db")
         .stroke();

      doc.fillColor("#6b7280").font("Courier-BoldOblique").fontSize(12).text(corpSignatory, 400, footerY + 16, { width: 140, align: "center" });
      doc.fillColor("#374151").font("Helvetica-Bold").fontSize(7.5).text("AUTHORIZED SIGNATORY", 400, footerY + 45, { width: 140, align: "center" });
    }
    doc.restore();
  }

  // Terms & Conditions below footer box
  doc.save();
  const termsY = hasCorpData ? footerY + 72 : totalsY + 30;
  doc.fillColor("#2f1618").font("Helvetica-Bold").fontSize(8.5).text("Terms & Conditions:", 40, termsY);
  doc.fillColor("#6b7280").font("Helvetica").fontSize(6.5);
  doc.text("• All products sold on Samagran are offered by Lal Bhandar under the brand name \"Samagran\" and may be fulfilled directly or through authorised fulfilment partners.", 40, termsY + 10);
  doc.text("• Applicable taxes (including GST, if any) are reflected on this invoice.", 40, termsY + 19);
  doc.text("• Any product-related issue must be reported within 24 hours of delivery.", 40, termsY + 27);
  doc.text("• Refunds, replacements and cancellations are subject to Samagran's applicable policies.", 40, termsY + 35);
  doc.text("• Certain consumable, edible, customised and puja-related products may not be eligible for return or replacement unless received in a damaged, defective or incorrect condition.", 40, termsY + 43, { width: 515 });
  doc.restore();

  doc.end();
};
