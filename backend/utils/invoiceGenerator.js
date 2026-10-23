import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isValEmpty = (val) => {
  if (!val) return true;
  const clean = String(val).trim();
  return clean === "" || clean === "—" || clean === "-" || clean === "null" || clean === "undefined";
};

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  const backendBase = (process.env.REACT_APP_API_URL || process.env.BACKEND_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
  return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

/**
 * Converts a number into Indian Rupees words.
 */
export function formatRupeesInWords(amount) {
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
 * Generates an invoice PDF matching the Admin Panel format using PDFKit.
 * Supports Unicode / Hindi (Devanagari) characters and ₹ symbol.
 * 
 * @param {object} order - Mongoose Order document
 * @param {WritableStream} stream - Target stream (e.g., res)
 */
export const generateInvoicePdf = async (order, stream) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  // Setup Poppins fonts which support full Latin (English), Devanagari (Hindi), digits, and Rupee (₹) symbol
  const fontsDir = path.resolve(__dirname, "../fonts");
  const regularFontPath = path.join(fontsDir, "Poppins-Regular.ttf");
  const boldFontPath = path.join(fontsDir, "Poppins-Bold.ttf");

  let regularFont = "Helvetica";
  let boldFont = "Helvetica-Bold";

  if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
    try {
      doc.registerFont("Poppins", regularFontPath);
      doc.registerFont("Poppins-Bold", boldFontPath);
      regularFont = "Poppins";
      boldFont = "Poppins-Bold";
    } catch (fontErr) {
      console.error("Failed to register Poppins fonts in PDFKit:", fontErr.message);
    }
  }

  // Retrieve Super Admin's corporateDetails dynamically
  let corporateDetails = {};
  try {
    const Admin = mongoose.models && mongoose.models.Admin;
    if (Admin) {
      const superAdmin = await Admin.findOne({ role: "super" }).lean();
      corporateDetails = superAdmin?.corporateDetails || {};
    }
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
  const invoiceNumber = order.invoiceDetails?.invoiceNumber || buildInvoiceNumber(order);

  // 1. Header Section
  let logoBuffer = null;
  const logoUrlToFetch = order.invoiceDetails?.logoUrl || corp.logoUrl;
  if (!isValEmpty(logoUrlToFetch)) {
    try {
      if (logoUrlToFetch.includes("/uploads/")) {
        const relPath = logoUrlToFetch.substring(logoUrlToFetch.indexOf("/uploads/"));
        const localPath = path.join(process.cwd(), relPath);
        if (fs.existsSync(localPath)) {
          logoBuffer = fs.readFileSync(localPath);
        }
      } else if (logoUrlToFetch.startsWith("http://") || logoUrlToFetch.startsWith("https://")) {
        const resp = await axios.get(logoUrlToFetch, { responseType: "arraybuffer", timeout: 5000 });
        logoBuffer = Buffer.from(resp.data);
      } else if (fs.existsSync(logoUrlToFetch)) {
        logoBuffer = fs.readFileSync(logoUrlToFetch);
      }
    } catch (err) {
      console.error("Failed to load corporate logo image for PDF:", err.message);
    }
  }

  const headerTitle = order.invoiceDetails?.companyName || (!isValEmpty(corp.companyName) ? corp.companyName : "Samagran");

  doc.save();
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 40, 40, { fit: [40, 40] });
      doc.fillColor("#8B1E3F")
         .fontSize(16)
         .font(boldFont)
         .text(headerTitle, 88, 50, { width: 260, height: 24, ellipsis: true });
    } catch (imgErr) {
      console.error("Failed to render logo image buffer in PDFKit:", imgErr.message);
      doc.circle(56, 60, 16).fillColor("#8B1E3F").fill();
      doc.fillColor("#ffffff").font(boldFont).fontSize(14).text("S", 51, 53);
      doc.fillColor("#8B1E3F").fontSize(16).font(boldFont).text(headerTitle, 80, 50, { width: 260, height: 24, ellipsis: true });
    }
  } else {
    doc.circle(56, 60, 16).fillColor("#8B1E3F").fill();
    doc.fillColor("#ffffff").font(boldFont).fontSize(14).text("S", 51, 53);
    doc.fillColor("#8B1E3F").fontSize(16).font(boldFont).text(headerTitle, 80, 50, { width: 260, height: 24, ellipsis: true });
  }

  // Tax Invoice Title on Right (matching Admin Panel: 24px, uppercase, #2f1618)
  doc.fillColor("#2f1618")
     .fontSize(20)
     .font(boldFont)
     .text("Tax Invoice", 355, 48, { width: 200, align: "right" });
  doc.restore();

  // Divider Line
  doc.strokeColor("#e5e7eb")
     .lineWidth(1)
     .moveTo(40, 90)
     .lineTo(555, 90)
     .stroke();

  // 2. Top Box: Seller Details (Left) & Invoice Number (Right)
  // Matching Admin Panel border-box grid-3
  const sellerY = 98;
  doc.save();
  
  // Outer Box
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

  doc.fillColor("#8B1E3F").font(boldFont).fontSize(9.5).text("Sold By / Seller:", 48, sellerY + 8);
  doc.fillColor("#1a1a1a").font(boldFont).fontSize(10).text(sellerName, 48, sellerY + 22, { width: 275, height: 14, ellipsis: true });
  doc.fillColor("#4b5563").font(regularFont).fontSize(8).text(sellerAddress, 48, sellerY + 37, { width: 275, height: 26, ellipsis: true });

  // Seller tax credentials
  const credentialParts = [];
  if (!isValEmpty(sellerGstin)) credentialParts.push(`GSTIN: ${sellerGstin}`);
  if (!isValEmpty(sellerPan)) credentialParts.push(`PAN: ${sellerPan}`);
  const credentialLine1 = credentialParts.join("   |   ");

  const credentialParts2 = [];
  if (!isValEmpty(sellerCin)) credentialParts2.push(`CIN: ${sellerCin}`);
  if (!isValEmpty(sellerFssai)) credentialParts2.push(`FSSAI No: ${sellerFssai}`);
  const credentialLine2 = credentialParts2.join("   |   ");

  const contactParts = [];
  if (!isValEmpty(sellerEmail)) contactParts.push(`Email: ${sellerEmail}`);
  if (!isValEmpty(sellerPhone)) contactParts.push(`Contact: ${sellerPhone}`);
  const contactLine = contactParts.join("   |   ");

  let credY = sellerY + 66;
  doc.fillColor("#374151").font(regularFont).fontSize(7.5);
  if (credentialLine1) {
    doc.text(credentialLine1, 48, credY, { width: 275, ellipsis: true });
    credY += 11;
  }
  if (credentialLine2) {
    doc.text(credentialLine2, 48, credY, { width: 275, ellipsis: true });
    credY += 11;
  }
  if (contactLine) {
    doc.text(contactLine, 48, credY, { width: 275, ellipsis: true });
  }

  // Invoice Number (Right Column) - Exactly like Admin Panel (light gray bg, centered label & number)
  doc.rect(330.5, sellerY + 0.5, 224, 114).fill("#fafafa");
  doc.fillColor("#9ca3af")
     .font(boldFont)
     .fontSize(8.5)
     .text("INVOICE NUMBER", 330, sellerY + 45, { width: 225, align: "center" });
  doc.fillColor("#1f2937")
     .font(boldFont)
     .fontSize(11)
     .text(invoiceNumber, 330, sellerY + 58, { width: 225, align: "center" });
  doc.restore();

  // 3. Middle Box: Customer Details (Left) & Order Details (Right)
  // Matching Admin Panel format
  const customerY = 220;
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
  const customerName = order.invoiceDetails?.customerName || order.user?.name || order.address?.name || "Customer";
  const customerAddress = order.invoiceDetails?.customerAddress || [
    order.address?.fullAddress,
    order.address?.city,
    order.address?.state,
    order.address?.pincode
  ].filter(Boolean).join(", ") || "Address not provided";
  const customerPhone = order.invoiceDetails?.customerPhone || order.user?.phone || order.address?.phone || "—";
  const customerEmail = order.invoiceDetails?.customerEmail || order.user?.email || "—";

  doc.fillColor("#8B1E3F").font(boldFont).fontSize(9.5).text("Invoice To:", 48, customerY + 8);
  doc.fillColor("#1a1a1a").font(boldFont).fontSize(10).text(customerName, 48, customerY + 22, { width: 275, height: 14, ellipsis: true });
  doc.fillColor("#4b5563").font(regularFont).fontSize(8).text(customerAddress, 48, customerY + 36, { width: 275, height: 26, ellipsis: true });
  
  // Divider line before contact
  doc.strokeColor("#f3f4f6").lineWidth(1).moveTo(48, customerY + 65).lineTo(320, customerY + 65).stroke();

  doc.fillColor("#6b7280").font(boldFont).fontSize(7.5);
  doc.text("Phone Number: ", 48, customerY + 70, { continued: true });
  doc.fillColor("#1a1a1a").font(boldFont).text(customerPhone);

  doc.fillColor("#6b7280").font(boldFont).fontSize(7.5);
  doc.text("Email ID: ", 48, customerY + 81, { continued: true });
  doc.fillColor("#1a1a1a").font(boldFont).text(customerEmail);

  // Right Column: Order details with #fafafa background (matching Admin Panel)
  doc.rect(330.5, customerY + 0.5, 224, 94).fill("#fafafa");
  
  const rightMetaY = customerY + 12;
  const metaLine = (label, val, yOff) => {
    const cleanVal = String(val ?? "").replace(/[\r\n]+/g, " ").trim();
    doc.fillColor("#4b5563").font(boldFont).fontSize(8).text(label, 342, rightMetaY + yOff);
    doc.fillColor("#1a1a1a").font(boldFont).fontSize(8).text(cleanVal, 415, rightMetaY + yOff, {
      width: 130,
      align: "right",
      lineBreak: false,
      height: 14,
      ellipsis: true,
    });
  };

  const invoiceDateStr = order.invoiceDetails?.invoiceDate || fmtDate(order.createdAt);
  const placeOfSupplyStr = order.invoiceDetails?.placeOfSupply || order.address?.state || "Maharashtra";
  const paymentModeStr = order.invoiceDetails?.paymentMode || order.paymentMethod || "COD";

  metaLine("Order ID:", `#${shortId(order._id)}`, 0);
  metaLine("Invoice Date:", invoiceDateStr, 18);
  metaLine("Place of Supply:", placeOfSupplyStr, 36);
  metaLine("Payment Mode:", paymentModeStr, 54);
  doc.restore();

  // 4. Product Table Header
  const tableY = 323;

  // Columns coordinates matching full 515pt table width with seamless borders
  const cols = [
    { name: "Sr. No.", x: 40, w: 26, align: "center" },
    { name: "SKU/UPC", x: 66, w: 68, align: "left" },
    { name: "Item Description", x: 134, w: 112, align: "left" },
    { name: "HSN/SAC", x: 246, w: 40, align: "center" },
    { name: "MRP (₹)", x: 286, w: 38, align: "right" },
    { name: "Discount (₹)", x: 324, w: 38, align: "right" },
    { name: "Qty", x: 362, w: 22, align: "center" },
    { name: "Taxable (₹)", x: 384, w: 44, align: "right" },
    { name: "GST (%)", x: 428, w: 30, align: "center" },
    { name: "GST Amt (₹)", x: 458, w: 44, align: "right" },
    { name: "Total (₹)", x: 502, w: 53, align: "right" }
  ];

  const colBorders = [66, 134, 246, 286, 324, 362, 384, 428, 458, 502];

  // Calculate dynamic header height so multi-line column headers never clip or cut off at the bottom
  doc.font(boldFont).fontSize(7);
  let maxHeaderH = 10;
  cols.forEach(c => {
    const h = doc.heightOfString(c.name, { width: c.w, align: "center" });
    if (h > maxHeaderH) maxHeaderH = h;
  });
  const headerPadding = 5;
  const headerHeight = Math.max(26, Math.ceil(maxHeaderH + (headerPadding * 2)));

  doc.save();
  // Header fill with dynamic height
  doc.rect(40, tableY, 515, headerHeight)
     .fill("#8B1E3F");

  // Header vertical column divider lines
  colBorders.forEach(bx => {
    doc.moveTo(bx, tableY)
       .lineTo(bx, tableY + headerHeight)
       .strokeColor("#a23354")
       .lineWidth(0.75)
       .stroke();
  });

  // Header bottom border
  doc.moveTo(40, tableY + headerHeight)
     .lineTo(555, tableY + headerHeight)
     .strokeColor("#d1d5db")
     .lineWidth(1)
     .stroke();

  // All header titles are center aligned as requested
  doc.fillColor("#ffffff").font(boldFont).fontSize(7);
  cols.forEach(c => {
    const textH = doc.heightOfString(c.name, { width: c.w, align: "center" });
    const textY = tableY + Math.max(headerPadding, Math.round((headerHeight - textH) / 2));
    doc.text(c.name, c.x, textY, { width: c.w, align: "center", lineGap: 1 });
  });
  doc.restore();

  // Product Table Rows start directly below the dynamic header
  let y = tableY + headerHeight;
  const items = order.items || [];
  
  let totalTaxableValue = 0;
  let totalGstAmount = 0;
  let totalMRP = 0;
  let totalDiscountVal = 0;

  items.forEach((item, idx) => {
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

    // Calculate dynamic row height based on content to prevent any text overlapping
    doc.font(regularFont).fontSize(7);
    const skuH = doc.heightOfString(skuStr, { width: cols[1].w - 6 });

    doc.font(boldFont).fontSize(7);
    const nameH = doc.heightOfString(nameStr, { width: cols[2].w - 6 });

    const contentH = Math.max(skuH, nameH, 10);
    const rowHeight = Math.max(24, Math.ceil(contentH + 12));

    doc.save();
    // Alternating bg matching Admin Panel
    if (idx % 2 !== 0) {
      doc.rect(40, y, 515, rowHeight)
         .fill("#fdf8f2");
    }

    doc.fillColor("#374151").font(regularFont).fontSize(7);
    
    // Sr No (center)
    doc.text(String(idx + 1), cols[0].x, y + 6, { width: cols[0].w, align: "center" });
    // SKU (left with 3pt padding)
    doc.text(skuStr, cols[1].x + 3, y + 6, { width: cols[1].w - 6, align: "left" });
    // Description (left with 3pt padding)
    doc.fillColor("#8B1E3F").font(boldFont);
    doc.text(nameStr, cols[2].x + 3, y + 6, { width: cols[2].w - 6, align: "left" });
    doc.fillColor("#374151").font(regularFont);
    // HSN (center)
    doc.text(hsnStr, cols[3].x, y + 6, { width: cols[3].w, align: "center" });
    // MRP (right with 3pt padding)
    doc.text(`₹${unitMRP.toFixed(2)}`, cols[4].x, y + 6, { width: cols[4].w - 3, align: "right" });
    // Discount (right with 3pt padding)
    doc.text(`₹${unitDiscount.toFixed(2)}`, cols[5].x, y + 6, { width: cols[5].w - 3, align: "right" });
    // Qty (center)
    doc.text(String(qty), cols[6].x, y + 6, { width: cols[6].w, align: "center" });
    // Taxable (right with 3pt padding)
    doc.text(`₹${taxableValue.toFixed(2)}`, cols[7].x, y + 6, { width: cols[7].w - 3, align: "right" });
    // GST (%) (center)
    doc.text(`${gstPercent}%`, cols[8].x, y + 6, { width: cols[8].w, align: "center" });
    // GST Amt (right with 3pt padding)
    doc.text(`₹${gstAmount.toFixed(2)}`, cols[9].x, y + 6, { width: cols[9].w - 3, align: "right" });
    // Total (right with 3pt padding)
    doc.font(boldFont).fillColor("#8B1E3F");
    doc.text(`₹${totalAmount.toFixed(2)}`, cols[10].x, y + 6, { width: cols[10].w - 3, align: "right" });

    // Horizontal divider line at the bottom of each row
    doc.moveTo(40, y + rowHeight)
       .lineTo(555, y + rowHeight)
       .strokeColor("#e5e7eb")
       .lineWidth(0.75)
       .stroke();

    y += rowHeight;
    doc.restore();
  });

  // Vertical column grid lines across all data rows
  doc.save();
  colBorders.forEach(bx => {
    doc.moveTo(bx, tableY + headerHeight)
       .lineTo(bx, y)
       .strokeColor("#e5e7eb")
       .lineWidth(0.75)
       .stroke();
  });

  // Draw outer table border
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

  // Left Side: Amount in Words with light gray box
  const wordsStr = formatRupeesInWords(grandTotal);
  doc.font(regularFont).fontSize(8);
  const wordsH = doc.heightOfString(wordsStr, { width: 244 });
  const wordsBoxH = Math.max(52, Math.ceil(wordsH + 24));

  doc.rect(40, totalsY - 2, 260, wordsBoxH)
     .strokeColor("#e5e7eb")
     .fillAndStroke("#f9fafb", "#e5e7eb");

  doc.fillColor("#8B1E3F").font(boldFont).fontSize(8.5).text("AMOUNT IN WORDS:", 48, totalsY + 4);
  doc.fillColor("#1f2937").font(regularFont).fontSize(8).text(wordsStr, 48, totalsY + 16, { width: 244 });

  // Right Side: Totals breakdown (matching Admin Panel)
  const rightX = 330;
  const valX = 455;
  const valW = 95;
  doc.fillColor("#4b5563").font(boldFont).fontSize(8);
  
  doc.text("Subtotal (MRP Total)", rightX, totalsY);
  doc.fillColor("#111827").text(`₹${totalMRP.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  doc.fillColor("#4b5563").text("Total Product Discount", rightX, totalsY);
  doc.fillColor("#111827").text(`-₹${totalDiscountVal.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  if (orderLevelDiscount > 0) {
    doc.fillColor("#4b5563").text("Coupon/Offer Discount", rightX, totalsY);
    doc.fillColor("#16a34a").text(`-₹${orderLevelDiscount.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
    totalsY += 14;
  }

  doc.fillColor("#4b5563").text("Total Taxable Value", rightX, totalsY);
  doc.fillColor("#111827").text(`₹${totalTaxableValue.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  doc.fillColor("#4b5563").text("Total GST Amount", rightX, totalsY);
  doc.fillColor("#111827").text(`₹${totalGstAmount.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  doc.fillColor("#4b5563").text("Shipping Charges", rightX, totalsY);
  doc.fillColor("#111827").text(`₹${deliveryFee.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });
  totalsY += 14;

  // Divider line
  doc.strokeColor("#e5e7eb")
     .lineWidth(1)
     .moveTo(rightX, totalsY + 2)
     .lineTo(550, totalsY + 2)
     .stroke();
  totalsY += 8;

  doc.fillColor("#2f1618").font(boldFont).fontSize(11).text("Grand Total", rightX, totalsY);
  doc.fillColor("#8B1E3F").text(`₹${grandTotal.toFixed(2)}`, valX, totalsY, { width: valW, align: "right" });

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

  const wordsBottom = (y + 12) + wordsBoxH;
  const totalsBottom = Math.max(totalsY + 15, wordsBottom + 10);
  let footerY = Math.max(totalsBottom + 15, 630);
  if (footerY + 140 > 800) {
    footerY = totalsBottom + 10;
  }

  if (hasCorpData) {
    doc.save();
    doc.rect(40, footerY, 515, 65)
       .strokeColor("#d1d5db")
       .lineWidth(1)
       .stroke();

    let curY = footerY + 8;
    if (!isValEmpty(corpName)) {
      doc.fillColor("#8B1E3F").font(boldFont).fontSize(8.5).text(`${corpName} (Corporate Office)`, 48, curY);
      curY += 12;
    }
    if (!isValEmpty(corpAddr)) {
      doc.fillColor("#4b5563").font(regularFont).fontSize(7).text(`Reg. Address: ${corpAddr}`, 48, curY, { width: 320, height: 12, ellipsis: true });
      curY += 12;
    }

    const taxLineParts = [];
    if (!isValEmpty(corpCin)) taxLineParts.push(`CIN: ${corpCin}`);
    if (!isValEmpty(corpPan)) taxLineParts.push(`PAN: ${corpPan}`);
    if (!isValEmpty(corpFssai)) taxLineParts.push(`FSSAI: ${corpFssai}`);
    if (taxLineParts.length > 0) {
      doc.fillColor("#4b5563").font(regularFont).fontSize(7).text(taxLineParts.join("  |  "), 48, curY);
      curY += 12;
    }

    const contactLineParts = [];
    if (!isValEmpty(corpEmail)) contactLineParts.push(`Customer Support: ${corpEmail}`);
    if (!isValEmpty(corpPhone)) contactLineParts.push(`Contact: ${corpPhone}`);
    if (contactLineParts.length > 0) {
      doc.fillColor("#4b5563").font(regularFont).fontSize(7).text(contactLineParts.join("  |  "), 48, curY);
    }

    // Signatory
    if (!isValEmpty(corpSignatory)) {
      doc.moveTo(380, footerY)
         .lineTo(380, footerY + 65)
         .strokeColor("#d1d5db")
         .stroke();

      doc.fillColor("#6b7280").font("Courier-BoldOblique").fontSize(12).text(corpSignatory, 400, footerY + 16, { width: 140, align: "center" });
      doc.fillColor("#374151").font(boldFont).fontSize(7.5).text("AUTHORIZED SIGNATORY", 400, footerY + 45, { width: 140, align: "center" });
    }
    doc.restore();
  }

  // Terms & Conditions below footer box (matching Admin Panel exactly)
  doc.save();
  const termsY = hasCorpData ? footerY + 72 : totalsY + 30;
  doc.fillColor("#2f1618").font(boldFont).fontSize(8.5).text("Terms & Conditions:", 40, termsY);
  doc.fillColor("#6b7280").font(regularFont).fontSize(6.5);
  doc.text("• All products sold on Samagran are offered by Lal Bhandar under the brand name \"Samagran\" and may be fulfilled directly or through authorised fulfilment partners.", 40, termsY + 10);
  doc.text("• Applicable taxes (including GST, if any) are reflected on this invoice.", 40, termsY + 19);
  doc.text("• Any product-related issue must be reported within 24 hours of delivery.", 40, termsY + 27);
  doc.text("• Refunds, replacements and cancellations are subject to Samagran's applicable policies.", 40, termsY + 35);
  doc.text("• Certain consumable, edible, customised and puja-related products may not be eligible for return or replacement unless received in a damaged, defective or incorrect condition.", 40, termsY + 43, { width: 515 });
  doc.restore();

  doc.end();
};

/**
 * Generates an HTML invoice string matching the Admin Panel format.
 * 
 * @param {object} order - Mongoose Order document
 * @returns {Promise<string>} HTML string
 */
export const generateInvoiceHtml = async (order) => {
  let corporateDetails = {};
  try {
    const Admin = mongoose.models && mongoose.models.Admin;
    if (Admin) {
      const superAdmin = await Admin.findOne({ role: "super" }).lean();
      corporateDetails = superAdmin?.corporateDetails || {};
    }
  } catch (err) {
    console.error("Failed to load corporateDetails in generateInvoiceHtml:", err);
  }

  const corp = corporateDetails || {};

  const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const shortId = (id) => String(id).slice(-8).toUpperCase();
  const buildInvoiceNumber = (order) => {
    const d = new Date(order.createdAt || Date.now());
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `INV-${ymd}-${shortId(order._id)}`;
  };
  const invoiceNumber = order.invoiceDetails?.invoiceNumber || buildInvoiceNumber(order);

  const headerTitle = order.invoiceDetails?.companyName || corp.companyName || "Samagran";
  const rawLogoUrl = order.invoiceDetails?.logoUrl || corp.logoUrl || "";
  let logoHtml = `<div style="width:40px;height:40px;border-radius:50%;background-color:#8B1E3F;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.1);">S</div>`;

  if (!isValEmpty(rawLogoUrl)) {
    logoHtml = `<img src="${getImageUrl(rawLogoUrl)}" alt="Logo" style="height:44px;max-width:160px;object-fit:contain;" />`;
  }

  // Seller Details
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
  const sellerPan = order.invoiceDetails?.sellerPan || vendor.kyc?.pan || vendor.pan || "";
  const sellerCin = order.invoiceDetails?.sellerCin || vendor.kyc?.cin || vendor.cin || "";
  const sellerEmail = order.invoiceDetails?.sellerEmail || vendor.email || "";
  const sellerPhone = order.invoiceDetails?.sellerPhone || vendor.phone || "";

  // Customer Details
  const customerName = order.invoiceDetails?.customerName || order.user?.name || order.address?.name || "Customer";
  const customerAddress = order.invoiceDetails?.customerAddress || [
    order.address?.fullAddress,
    order.address?.city,
    order.address?.state,
    order.address?.pincode
  ].filter(Boolean).join(", ") || "Address not provided";
  const customerPhone = order.invoiceDetails?.customerPhone || order.user?.phone || order.address?.phone || "—";
  const customerEmail = order.invoiceDetails?.customerEmail || order.user?.email || "—";

  // Items & Calculations
  const items = order.items || [];
  let totalTaxableValue = 0;
  let totalGstAmount = 0;
  let totalMRP = 0;
  let totalDiscountVal = 0;

  const rowsHtml = items.map((item, idx) => {
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

    totalTaxableValue += taxableValue;
    totalGstAmount += gstAmount;
    totalMRP += unitMRP * qty;
    totalDiscountVal += unitDiscount * qty;

    return `
      <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#fdf8f2"};">
        <td style="padding:9px 6px;text-align:center;color:#555;font-weight:600;border:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:9px 6px;font-family:monospace;font-size:11px;color:#444;border:1px solid #e5e7eb;">${skuStr}</td>
        <td style="padding:9px 6px;font-weight:bold;color:#8B1E3F;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid #e5e7eb;">${nameStr}</td>
        <td style="padding:9px 6px;text-align:center;color:#555;font-weight:600;border:1px solid #e5e7eb;">${hsnStr}</td>
        <td style="padding:9px 6px;text-align:right;color:#444;font-weight:600;border:1px solid #e5e7eb;">₹${unitMRP.toFixed(2)}</td>
        <td style="padding:9px 6px;text-align:right;color:#444;font-weight:600;border:1px solid #e5e7eb;">₹${unitDiscount.toFixed(2)}</td>
        <td style="padding:9px 6px;text-align:center;font-weight:bold;color:#333;border:1px solid #e5e7eb;">${qty}</td>
        <td style="padding:9px 6px;text-align:right;color:#444;font-weight:600;border:1px solid #e5e7eb;">₹${taxableValue.toFixed(2)}</td>
        <td style="padding:9px 6px;text-align:center;color:#555;font-weight:600;border:1px solid #e5e7eb;">${gstPercent}%</td>
        <td style="padding:9px 6px;text-align:right;color:#444;font-weight:600;border:1px solid #e5e7eb;">₹${gstAmount.toFixed(2)}</td>
        <td style="padding:9px 6px;text-align:right;font-weight:bold;color:#8B1E3F;border:1px solid #e5e7eb;">₹${totalAmount.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const deliveryFee = Number(order.amountBreakup?.deliveryFee || 0);
  const couponDiscount = Number(order.amountBreakup?.couponDiscount || 0);
  const offerDiscount = Number(order.amountBreakup?.offerDiscount || 0);
  const orderLevelDiscount = couponDiscount + offerDiscount;

  const grandTotal = Number(order.totalAmount || (totalTaxableValue + totalGstAmount + deliveryFee - orderLevelDiscount));

  const discountRow = orderLevelDiscount > 0 ? `
    <div style="display:flex;justify-content:space-between;color:#4b5563;font-weight:600;margin-bottom:6px;">
      <span>Coupon/Offer Discount</span>
      <span style="color:#16a34a;font-weight:bold;">-₹${orderLevelDiscount.toFixed(2)}</span>
    </div>
  ` : "";

  const corpTaxParts = [];
  const compCin = order.invoiceDetails?.companyCin || corp.cin || "";
  const compPan = order.invoiceDetails?.companyPan || corp.pan || "";
  const compFssai = order.invoiceDetails?.companyFssai || corp.fssai || "";
  const compEmail = order.invoiceDetails?.companyEmail || corp.email || "";
  const compPhone = order.invoiceDetails?.companyPhone || corp.phone || "";
  const compSignatory = order.invoiceDetails?.authorizedSignatory || corp.authorizedSignatory || "";
  const compAddr = order.invoiceDetails?.companyAddress || corp.address || "";

  if (!isValEmpty(compCin)) corpTaxParts.push(`CIN: ${compCin}`);
  if (!isValEmpty(compPan)) corpTaxParts.push(`PAN: ${compPan}`);
  if (!isValEmpty(compFssai)) corpTaxParts.push(`FSSAI: ${compFssai}`);

  const corpContactParts = [];
  if (!isValEmpty(compEmail)) corpContactParts.push(`Customer Support: ${compEmail}`);
  if (!isValEmpty(compPhone)) corpContactParts.push(`Contact: ${compPhone}`);

  const hasCorpData = !isValEmpty(headerTitle) || !isValEmpty(compAddr) || corpTaxParts.length > 0 || corpContactParts.length > 0 || !isValEmpty(compSignatory);

  const corpHtml = hasCorpData ? `
    <div class="border-box grid-3">
      <div style="padding:12px;font-size:10px;color:#6b7280;line-height:1.5;font-weight:600;">
        ${!isValEmpty(headerTitle) ? `<p style="font-size:11px;font-weight:bold;color:#8B1E3F;margin-bottom:4px;">${headerTitle} (Corporate Office)</p>` : ""}
        ${!isValEmpty(compAddr) ? `<p>Reg. Address: ${compAddr}</p>` : ""}
        ${corpTaxParts.length > 0 ? `<p>${corpTaxParts.join("  |  ")}</p>` : ""}
        ${corpContactParts.length > 0 ? `<p style="margin-top:4px;">${corpContactParts.join("  |  ")}</p>` : ""}
      </div>
      ${!isValEmpty(compSignatory) ? `
      <div style="padding:12px;border-left:1px solid #d1d5db;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;">
        <span style="font-family:'Brush Script MT', cursive, sans-serif;font-size:18px;color:#9ca3af;font-weight:bold;margin-top:4px;">${compSignatory}</span>
        <span style="font-size:9px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f3f4f6;width:100%;padding-top:6px;margin-top:8px;">Authorized Signatory</span>
      </div>
      ` : ""}
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 40px 48px; max-width: 900px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4; }
    table { width: 100%; border-collapse: collapse; }
    .grid { display: grid; }
    .grid-2 { display: grid; grid-template-columns: 2fr 1fr; }
    .grid-3 { display: grid; grid-template-columns: 2fr 1fr; }
    .border-box { border: 1px solid #d1d5db; border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logoHtml}
      <div>
        <span style="font-size:20px;font-weight:800;color:#8B1E3F;letter-spacing:-0.5px;">${headerTitle}</span>
      </div>
    </div>
    <div style="text-align:right;">
      <h1 style="font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#2f1618;">Tax Invoice</h1>
    </div>
  </div>

  <div style="height:1px;background-color:#e5e7eb;margin-bottom:20px;"></div>

  <div class="border-box grid-3">
    <div style="padding:16px;border-right:1px solid #d1d5db;">
      <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#8B1E3F;margin-bottom:6px;">Sold By / Seller:</p>
      <p style="font-weight:800;font-size:14px;color:#1a1a1a;margin-bottom:4px;">${sellerName}</p>
      <p style="font-size:12px;color:#4b5563;line-height:1.5;margin-bottom:10px;white-space:pre-wrap;">${sellerAddress}</p>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;color:#6b7280;font-weight:600;border-top:1px solid #f3f4f6;padding-top:8px;">
        ${!isValEmpty(sellerGstin) ? `<p>GSTIN: <span style="color:#1a1a1a;font-weight:bold;">${sellerGstin}</span></p>` : ""}
        ${!isValEmpty(sellerPan) ? `<p>PAN: <span style="color:#1a1a1a;font-weight:bold;">${sellerPan}</span></p>` : ""}
        ${!isValEmpty(sellerCin) ? `<p>CIN: <span style="color:#1a1a1a;font-weight:bold;">${sellerCin}</span></p>` : ""}
        ${!isValEmpty(sellerFssai) ? `<p>FSSAI No: <span style="color:#1a1a1a;font-weight:bold;">${sellerFssai}</span></p>` : ""}
        ${(!isValEmpty(sellerEmail) || !isValEmpty(sellerPhone)) ? `
          <p style="grid-column: span 2;margin-top:4px;">
            ${!isValEmpty(sellerEmail) ? `Email: <span style="color:#1a1a1a;font-weight:bold;">${sellerEmail}</span>` : ""}
            ${(!isValEmpty(sellerEmail) && !isValEmpty(sellerPhone)) ? "  |  " : ""}
            ${!isValEmpty(sellerPhone) ? `Contact: <span style="color:#1a1a1a;font-weight:bold;">${sellerPhone}</span>` : ""}
          </p>
        ` : ""}
      </div>
    </div>
    <div style="padding:16px;background-color:#fafafa;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <div>
        <p style="font-size:9px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Invoice Number</p>
        <p style="font-size:12px;font-weight:bold;color:#1f2937;font-family:monospace;margin-top:2px;">${invoiceNumber}</p>
      </div>
    </div>
  </div>

  <div class="border-box grid-3">
    <div style="padding:16px;border-right:1px solid #d1d5db;">
      <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#8B1E3F;margin-bottom:6px;">Invoice To:</p>
      <p style="font-weight:800;font-size:14px;color:#1a1a1a;margin-bottom:4px;">${customerName}</p>
      <p style="font-size:12px;color:#4b5563;line-height:1.5;margin-bottom:10px;white-space:pre-wrap;">${customerAddress}</p>
      
      <div style="font-size:10px;color:#6b7280;font-weight:600;border-top:1px solid #f3f4f6;padding-top:8px;">
        <p>Phone Number: <span style="color:#1a1a1a;font-weight:bold;">${customerPhone}</span></p>
        <p>Email ID: <span style="color:#1a1a1a;font-weight:bold;">${customerEmail}</span></p>
      </div>
    </div>
    <div style="padding:16px;background-color:#fafafa;display:flex;flex-direction:column;gap:8px;justify-content:center;font-size:12px;color:#4b5563;font-weight:600;">
      <div style="display:flex;justify-content:space-between;">
        <span>Order ID:</span>
        <span style="color:#1a1a1a;font-family:monospace;font-weight:bold;">#${shortId(order._id)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Invoice Date:</span>
        <span style="color:#1a1a1a;font-weight:bold;">${order.invoiceDetails?.invoiceDate || fmtDate(order.createdAt)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Place of Supply:</span>
        <span style="color:#1a1a1a;font-weight:bold;">${order.invoiceDetails?.placeOfSupply || order.address?.state || "Maharashtra"}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Payment Mode:</span>
        <span style="color:#1a1a1a;font-weight:bold;">${order.invoiceDetails?.paymentMode || order.paymentMethod || "COD"}</span>
      </div>
    </div>
  </div>

  <div class="border-box">
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background-color:#8B1E3F;color:#ffffff;text-align:center;">
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">Sr. No.</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">SKU/UPC</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">Item Description</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">HSN/SAC</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">MRP (₹)</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">Discount (₹)</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">Qty</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">Taxable (₹)</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">GST (%)</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">GST Amt (₹)</th>
          <th style="padding:10px 6px;text-align:center;font-weight:bold;border:1px solid #9e2c4d;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>

  <div class="grid-2" style="margin-bottom:24px;gap:20px;">
    <div>
      <div style="padding:14px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
        <p style="font-size:10px;font-weight:bold;color:#8B1E3F;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Amount in Words:</p>
        <p style="font-size:12px;font-weight:bold;color:#1f2937;font-style:italic;line-height:1.5;">${formatRupeesInWords(grandTotal)}</p>
      </div>
    </div>
    <div style="font-size:12px;color:#4b5563;line-height:1.8;">
      <div style="display:flex;justify-content:space-between;color:#4b5563;font-weight:600;margin-bottom:6px;">
        <span>Subtotal (MRP Total)</span>
        <span style="color:#111827;font-weight:bold;">₹${totalMRP.toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:#4b5563;font-weight:600;margin-bottom:6px;">
        <span>Total Product Discount</span>
        <span style="color:#111827;font-weight:bold;">-₹${totalDiscountVal.toFixed(2)}</span>
      </div>
      ${discountRow}
      <div style="display:flex;justify-content:space-between;color:#4b5563;font-weight:600;margin-bottom:6px;">
        <span>Total Taxable Value</span>
        <span style="color:#111827;font-weight:bold;">₹${totalTaxableValue.toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:#4b5563;font-weight:600;margin-bottom:6px;">
        <span>Total GST Amount</span>
        <span style="color:#111827;font-weight:bold;">₹${totalGstAmount.toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:#4b5563;font-weight:600;margin-bottom:6px;">
        <span>Shipping Charges</span>
        <span style="color:#111827;font-weight:bold;">₹${deliveryFee.toFixed(2)}</span>
      </div>
      <div style="border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:space-between;font-size:14px;font-weight:800;color:#2f1618;">
        <span>Grand Total</span>
        <span style="color:#8B1E3F;">₹${grandTotal.toFixed(2)}</span>
      </div>
    </div>
  </div>
  
  ${corpHtml}

  <div style="font-size:9px;color:#9ca3af;font-weight:600;line-height:1.6;border-top:1px solid #f3f4f6;padding-top:12px;">
    <p style="font-weight:bold;color:#6b7280;font-size:11px;margin-bottom:4px;">Terms & Conditions:</p>
    <p style="margin-bottom:3px;">• All products sold on Samagran are offered by Lal Bhandar under the brand name "Samagran" and may be fulfilled directly or through authorised fulfilment partners.</p>
    <p style="margin-bottom:3px;">• Applicable taxes (including GST, if any) are reflected on this invoice.</p>
    <p style="margin-bottom:3px;">• Any product-related issue must be reported within 24 hours of delivery.</p>
    <p style="margin-bottom:3px;">• Refunds, replacements and cancellations are subject to Samagran's applicable policies.</p>
    <p style="margin-bottom:3px;">• Certain consumable, edible, customised and puja-related products may not be eligible for return or replacement unless received in a damaged, defective or incorrect condition.</p>
  </div>

</body>
</html>`;
};
