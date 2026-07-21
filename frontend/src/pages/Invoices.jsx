import { useCallback, useEffect, useState } from "react";
import API from "../api/axios";
import TablePagination from "../components/TablePagination";
import { toast } from "react-toastify";
import { getStoredAdmin } from "../utils/auth";

/* ─── helpers ─────────────────────────────────────────────── */
const isValEmpty = (val) => {
  if (!val) return true;
  const clean = String(val).trim();
  return clean === "" || clean === "—" || clean === "-" || clean === "null" || clean === "undefined";
};

const fmt = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const shortId = (id = "") => String(id).slice(-8).toUpperCase();

const ORDER_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "placed", label: "Placed" },
  { value: "confirmed", label: "Confirmed" },
  // { value: "preparing", label: "Preparing" },
  { value: "out for delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColor = (s = "") => {
  const v = s.toLowerCase();
  if (v === "delivered")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (v === "cancelled")
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  if (v === "out for delivery")
    return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300";
  if (v === "confirmed")
    return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300";
  // if (v === "preparing")
  //   return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300";
  // return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
};

const paymentColor = (s = "") => {
  const v = s.toLowerCase();
  if (v === "paid")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (v === "failed")
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
};

/* ─── Invoice number generator ─────────────────────────────── */
const buildInvoiceNumber = (order) => {
  if (!order) return "";
  const d = new Date(order.createdAt || Date.now());
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${shortId(order._id)}`;
};

/* ═══════════════════════════════════════════════════════════ */
/* Invoice helper functions & Rupees in Words converter       */
/* ═══════════════════════════════════════════════════════════ */
function formatRupeesInWords(amount) {
  const parts = Number(amount || 0)
    .toFixed(2)
    .split(".");
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

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

/* ═══════════════════════════════════════════════════════════ */
/* InvoicePreview component – rendered in DOM, printed as PDF */
/* ═══════════════════════════════════════════════════════════ */
function InvoicePreview({ order, onClose, onUpdated }) {
  const items = Array.isArray(order.items) ? order.items : [];

  // Calculate Totals
  let totalTaxableValue = 0;
  let totalGstAmount = 0;
  let totalMRP = 0;
  let totalDiscountVal = 0;

  const itemDetails = items.map((item) => {
    const p = item.product;
    const nameStr = p
      ? p.title || p.name || p.kitName || item.productType || "Product"
      : item.productType || "Product";
    const skuStr =
      p?.itemCode ||
      (p?.slug
        ? `KIT-${p.slug.toUpperCase()}`
        : `PROD-${String(item._id).slice(-6).toUpperCase()}`);
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

    return {
      sku: skuStr,
      name: nameStr,
      hsn: hsnStr,
      mrp: unitMRP,
      discount: unitDiscount,
      qty,
      taxableValue,
      gstPercent,
      gstAmount,
      totalAmount,
    };
  });

  const deliveryFee = Number(order.amountBreakup?.deliveryFee || 0);
  const couponDiscount = Number(order.amountBreakup?.couponDiscount || 0);
  const offerDiscount = Number(order.amountBreakup?.offerDiscount || 0);
  const orderLevelDiscount = couponDiscount + offerDiscount;
  const grandTotal = Number(
    order.totalAmount ||
      totalTaxableValue + totalGstAmount + deliveryFee - orderLevelDiscount,
  );

  const vendor = order.vendorId || {};

  // --- STATE FOR EDITABLE DATA ---
  const [isEditing, setIsEditing] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    // Seller Details
    sellerName: order.invoiceDetails?.sellerName || vendor.businessName || vendor.name || "Samagran Ventures LLP",
    sellerAddress: order.invoiceDetails?.sellerAddress ||
      [
        vendor.address?.line1,
        vendor.address?.line2,
        vendor.address?.city,
        vendor.address?.state,
        vendor.address?.pincode,
      ]
        .filter(Boolean)
        .join(", ") ||
      "Godown, Patlipada, Near Ramnath Tabela, Thane (M.Corp)-400607, Maharashtra",
    // KYC fields from vendor.kyc (dynamic from DB)
    sellerGstin: order.invoiceDetails?.sellerGstin || vendor.kyc?.gst || vendor.gstin || "",
    sellerFssai: order.invoiceDetails?.sellerFssai || vendor.kyc?.fssai || vendor.fssai || "",
    sellerCin: order.invoiceDetails?.sellerCin || vendor.kyc?.cin || vendor.cin || "",
    sellerPan: order.invoiceDetails?.sellerPan || vendor.kyc?.pan || vendor.pan || "",
    sellerEmail: order.invoiceDetails?.sellerEmail || vendor.email || "",
    sellerPhone: order.invoiceDetails?.sellerPhone || vendor.phone || "",

    // Customer Details
    customerName: order.invoiceDetails?.customerName || order.user?.name || order.address?.name || "Customer",
    customerAddress: order.invoiceDetails?.customerAddress ||
      [
        order.address?.fullAddress,
        order.address?.city,
        order.address?.state,
        order.address?.pincode,
      ]
        .filter(Boolean)
        .join(", ") || "Address not provided",
    customerPhone: order.invoiceDetails?.customerPhone || order.user?.phone || order.address?.phone || "",
    customerEmail: order.invoiceDetails?.customerEmail || order.user?.email || "",

    // Invoice Metadata
    invoiceNumber: order.invoiceDetails?.invoiceNumber || buildInvoiceNumber(order),
    invoiceDate: order.invoiceDetails?.invoiceDate || fmtDate(order.createdAt),
    placeOfSupply: order.invoiceDetails?.placeOfSupply || order.address?.state || "Maharashtra",
    paymentMode: order.invoiceDetails?.paymentMode || order.paymentMethod || "COD",

    // Corporate & Signatory Details
    companyName: order.invoiceDetails?.companyName || "",
    logoUrl: order.invoiceDetails?.logoUrl || "",
    companyAddress: order.invoiceDetails?.companyAddress || "",
    companyCin: order.invoiceDetails?.companyCin || "",
    companyPan: order.invoiceDetails?.companyPan || "",
    companyFssai: order.invoiceDetails?.companyFssai || "",
    companyEmail: order.invoiceDetails?.companyEmail || "",
    companyPhone: order.invoiceDetails?.companyPhone || "",
    authorizedSignatory: order.invoiceDetails?.authorizedSignatory || "",
  });

  const handleChange = (e) => {
    setInvoiceData({ ...invoiceData, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  };

  useEffect(() => {
    const fetchCorpDetails = async () => {
      try {
        const res = await API.get("/admin/corporate-details");
        const corp = res.data?.data || {};
        setInvoiceData((prev) => ({
          ...prev,
          companyName: prev.companyName !== undefined && prev.companyName !== "" ? prev.companyName : (corp.companyName || ""),
          logoUrl: prev.logoUrl !== undefined && prev.logoUrl !== "" ? prev.logoUrl : (corp.logoUrl || ""),
          companyAddress: prev.companyAddress !== undefined && prev.companyAddress !== "" ? prev.companyAddress : (corp.address || ""),
          companyCin: prev.companyCin !== undefined && prev.companyCin !== "" ? prev.companyCin : (corp.cin || ""),
          companyPan: prev.companyPan !== undefined && prev.companyPan !== "" ? prev.companyPan : (corp.pan || ""),
          companyFssai: prev.companyFssai !== undefined && prev.companyFssai !== "" ? prev.companyFssai : (corp.fssai || ""),
          companyEmail: prev.companyEmail !== undefined && prev.companyEmail !== "" ? prev.companyEmail : (corp.email || ""),
          companyPhone: prev.companyPhone !== undefined && prev.companyPhone !== "" ? prev.companyPhone : (corp.phone || ""),
          authorizedSignatory: prev.authorizedSignatory !== undefined && prev.authorizedSignatory !== "" ? prev.authorizedSignatory : (corp.authorizedSignatory || ""),
        }));
      } catch (err) {
        console.error("Failed to load corporate details:", err);
      }
    };
    fetchCorpDetails();
  }, []);

  const handleSaveClick = async () => {
    if (isEditing) {
      try {
        await API.patch(`/admin/orders/${order._id}/invoice-details`, {
          invoiceDetails: invoiceData,
        });
        toast.success("Invoice details updated successfully!");
        if (onUpdated) onUpdated();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to update invoice details");
      }
    }
    setIsEditing(!isEditing);
  };

  // --- PDF DOWNLOADER (Moved inside so it uses updated invoiceData) ---
  const handleDownloadPdf = useCallback(() => {
    const rowsHtml = itemDetails
      .map(
        (item, idx) => `
      <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#fdf8f2"}; border-top: 1px solid #e5e7eb;">
        <td style="padding:10px 8px;text-align:center;color:#555;font-weight:600;">${idx + 1}</td>
        <td style="padding:10px 8px;font-family:monospace;font-size:11px;color:#444;">${item.sku}</td>
        <td style="padding:10px 8px;font-weight:bold;color:#8B1E3F;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</td>
        <td style="padding:10px 8px;color:#555;font-weight:600;">${item.hsn}</td>
        <td style="padding:10px 8px;text-align:right;color:#444;font-weight:600;">₹${item.mrp.toFixed(2)}</td>
        <td style="padding:10px 8px;text-align:right;color:#444;font-weight:600;">₹${item.discount.toFixed(2)}</td>
        <td style="padding:10px 8px;text-align:center;font-weight:bold;color:#333;">${item.qty}</td>
        <td style="padding:10px 8px;text-align:right;color:#444;font-weight:600;">₹${item.taxableValue.toFixed(2)}</td>
        <td style="padding:10px 8px;text-align:center;color:#555;font-weight:600;">${item.gstPercent}%</td>
        <td style="padding:10px 8px;text-align:right;color:#444;font-weight:600;">₹${item.gstAmount.toFixed(2)}</td>
        <td style="padding:10px 8px;text-align:right;font-weight:bold;color:#8B1E3F;">₹${item.totalAmount.toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const discountRow =
      orderLevelDiscount > 0
        ? `
      <div style="display:flex;justify-content:space-between;color:#4b5563;font-weight:600;margin-bottom:6px;">
        <span>Coupon/Offer Discount</span>
        <span style="color:#16a34a;font-weight:bold;">-₹${orderLevelDiscount.toFixed(2)}</span>
      </div>
    `
        : "";

    const logoHtml = invoiceData.logoUrl
      ? `<img src="${invoiceData.logoUrl}" alt="Logo" style="height:44px;max-width:160px;object-fit:contain;" />`
      : `<div style="width:40px;height:40px;border-radius:50%;background-color:#8B1E3F;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.1);">S</div>`;

    const corpTaxParts = [];
    if (!isValEmpty(invoiceData.companyCin)) corpTaxParts.push(`CIN: ${invoiceData.companyCin}`);
    if (!isValEmpty(invoiceData.companyPan)) corpTaxParts.push(`PAN: ${invoiceData.companyPan}`);
    if (!isValEmpty(invoiceData.companyFssai)) corpTaxParts.push(`FSSAI: ${invoiceData.companyFssai}`);

    const corpContactParts = [];
    if (!isValEmpty(invoiceData.companyEmail)) corpContactParts.push(`Customer Support: ${invoiceData.companyEmail}`);
    if (!isValEmpty(invoiceData.companyPhone)) corpContactParts.push(`Contact: ${invoiceData.companyPhone}`);

    const hasCorpData = !isValEmpty(invoiceData.companyName) || !isValEmpty(invoiceData.companyAddress) || corpTaxParts.length > 0 || corpContactParts.length > 0 || !isValEmpty(invoiceData.authorizedSignatory);

    const corpHtml = hasCorpData ? `
  <div class="border-box grid-3">
    <div style="padding:12px;font-size:10px;color:#6b7280;line-height:1.5;font-weight:600;">
      ${!isValEmpty(invoiceData.companyName) ? `<p style="font-size:11px;font-weight:bold;color:#8B1E3F;margin-bottom:4px;">${invoiceData.companyName} (Corporate Office)</p>` : ""}
      ${!isValEmpty(invoiceData.companyAddress) ? `<p>Reg. Address: ${invoiceData.companyAddress}</p>` : ""}
      ${corpTaxParts.length > 0 ? `<p>${corpTaxParts.join("  |  ")}</p>` : ""}
      ${corpContactParts.length > 0 ? `<p style="margin-top:4px;">${corpContactParts.join("  |  ")}</p>` : ""}
    </div>
    ${!isValEmpty(invoiceData.authorizedSignatory) ? `
    <div style="padding:12px;border-left:1px solid #d1d5db;display:flex;flex-direction:column;justify-content:space-between;align-items:center;text-align:center;">
      <span style="font-family:'Brush Script MT', cursive, sans-serif;font-size:18px;color:#9ca3af;font-weight:bold;margin-top:4px;">${invoiceData.authorizedSignatory}</span>
      <span style="font-size:9px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-top:1px solid #f3f4f6;width:100%;padding-top:6px;margin-top:8px;">Authorized Signatory</span>
    </div>
    ` : ""}
  </div>
  ` : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoiceData.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 40px 48px; max-width: 900px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4; }
    table { width: 100%; border-collapse: collapse; }
    .grid { display: grid; }
    .grid-2 { display: grid; grid-template-columns: 2fr 1fr; }
    .grid-3 { display: grid; grid-template-columns: 2fr 1fr; }
    .border-box { border: 1px solid #d1d5db; border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logoHtml}
      <div>
        <span style="font-size:20px;font-weight:800;color:#8B1E3F;letter-spacing:-0.5px;">Samagran</span>
        <p style="font-size:10px;color:#6b7280;font-weight:500;margin-top:1px;">Marketplace Portal</p>
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
      <p style="font-weight:800;font-size:14px;color:#1a1a1a;margin-bottom:4px;">${invoiceData.sellerName}</p>
      <p style="font-size:12px;color:#4b5563;line-height:1.5;margin-bottom:10px;white-space:pre-wrap;">${invoiceData.sellerAddress}</p>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;color:#6b7280;font-weight:600;border-top:1px solid #f3f4f6;padding-top:8px;">
        ${!isValEmpty(invoiceData.sellerGstin) ? `<p>GSTIN: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.sellerGstin}</span></p>` : ""}
        ${!isValEmpty(invoiceData.sellerPan) ? `<p>PAN: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.sellerPan}</span></p>` : ""}
        ${!isValEmpty(invoiceData.sellerCin) ? `<p>CIN: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.sellerCin}</span></p>` : ""}
        ${!isValEmpty(invoiceData.sellerFssai) ? `<p>FSSAI No: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.sellerFssai}</span></p>` : ""}
        ${(!isValEmpty(invoiceData.sellerEmail) || !isValEmpty(invoiceData.sellerPhone)) ? `
          <p style="grid-column: span 2;margin-top:4px;">
            ${!isValEmpty(invoiceData.sellerEmail) ? `Email: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.sellerEmail}</span>` : ""}
            ${(!isValEmpty(invoiceData.sellerEmail) && !isValEmpty(invoiceData.sellerPhone)) ? "  |  " : ""}
            ${!isValEmpty(invoiceData.sellerPhone) ? `Contact: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.sellerPhone}</span>` : ""}
          </p>
        ` : ""}
      </div>
    </div>
    <div style="padding:16px;background-color:#fafafa;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      <div>
        <p style="font-size:9px;font-weight:bold;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Invoice Number</p>
        <p style="font-size:12px;font-weight:bold;color:#1f2937;font-family:monospace;margin-top:2px;">${invoiceData.invoiceNumber}</p>
      </div>
    </div>
  </div>

  <div class="border-box grid-3">
    <div style="padding:16px;border-right:1px solid #d1d5db;">
      <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#8B1E3F;margin-bottom:6px;">Invoice To:</p>
      <p style="font-weight:800;font-size:14px;color:#1a1a1a;margin-bottom:4px;">${invoiceData.customerName}</p>
      <p style="font-size:12px;color:#4b5563;line-height:1.5;margin-bottom:10px;white-space:pre-wrap;">${invoiceData.customerAddress}</p>
      
      <div style="font-size:10px;color:#6b7280;font-weight:600;border-top:1px solid #f3f4f6;padding-top:8px;">
        <p>Phone Number: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.customerPhone}</span></p>
        <p>Email ID: <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.customerEmail}</span></p>
      </div>
    </div>
    <div style="padding:16px;background-color:#fafafa;display:flex;flex-direction:column;gap:8px;justify-content:center;font-size:12px;color:#4b5563;font-weight:600;">
      <div style="display:flex;justify-content:space-between;">
        <span>Order ID:</span>
        <span style="color:#1a1a1a;font-family:monospace;font-weight:bold;">#${shortId(order._id)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Invoice Date:</span>
        <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.invoiceDate}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Place of Supply:</span>
        <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.placeOfSupply}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>Payment Mode:</span>
        <span style="color:#1a1a1a;font-weight:bold;">${invoiceData.paymentMode}</span>
      </div>
    </div>
  </div>

  <div class="border-box">
    <table style="font-size:11px;">
      <thead>
        <tr style="background-color:#8B1E3F;color:#ffffff;text-align:left;">
          <th style="padding:10px 8px;text-align:center;font-weight:bold;">Sr. No.</th>
          <th style="padding:10px 8px;font-weight:bold;">SKU/UPC</th>
          <th style="padding:10px 8px;font-weight:bold;">Item Description</th>
          <th style="padding:10px 8px;font-weight:bold;">HSN/SAC</th>
          <th style="padding:10px 8px;text-align:right;font-weight:bold;">MRP (₹)</th>
          <th style="padding:10px 8px;text-align:right;font-weight:bold;">Discount (₹)</th>
          <th style="padding:10px 8px;text-align:center;font-weight:bold;">Qty</th>
          <th style="padding:10px 8px;text-align:right;font-weight:bold;">Taxable (₹)</th>
          <th style="padding:10px 8px;text-align:center;font-weight:bold;">GST (%)</th>
          <th style="padding:10px 8px;text-align:right;font-weight:bold;">GST Amt (₹)</th>
          <th style="padding:10px 8px;text-align:right;font-weight:bold;">Total (₹)</th>
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

    const popup = window.open(
      "",
      "_blank",
      "width=900,height=700,scrollbars=yes",
    );
    if (!popup) {
      alert("Please allow pop-ups for this site to download the invoice PDF.");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }, [
    invoiceData,
    itemDetails,
    orderLevelDiscount,
    grandTotal,
    totalMRP,
    totalDiscountVal,
    totalTaxableValue,
    totalGstAmount,
    deliveryFee,
    order._id,
  ]);

  const EditableField = ({
    name,
    value,
    isTextArea = false,
    className = "",
  }) => {
    if (!isEditing) return <span className={className}>{value}</span>;
    if (isTextArea) {
      return (
        <textarea
          name={name}
          value={value}
          onChange={handleChange}
          className="w-full bg-white/60 border border-gray-300 rounded px-2 py-1 text-black font-normal focus:outline-[#8B1E3F] resize-none"
          rows={3}
        />
      );
    }
    return (
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        className="w-full bg-white/60 border border-gray-300 rounded px-2 py-1 text-black font-normal focus:outline-[#8B1E3F]"
      />
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative flex flex-col w-full max-w-4xl max-h-[95vh] rounded-2xl sm:rounded-3xl border border-[#d8c4a5] bg-[#fffdf8] shadow-2xl dark:border-white/10 dark:bg-[#141820] overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b border-[#e8d9c4] dark:border-white/10 gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#2f1618] dark:text-[#fff3dc]">
              Invoice Preview
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleSaveClick}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  isEditing
                    ? "bg-[#8B1E3F] text-white border-[#8B1E3F] hover:bg-[#a0233f]"
                    : "border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0]"
                }`}
              >
                {isEditing ? "Save Details" : "Edit Details"}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7bf9b] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M12 15V4M12 15L8 11M12 15L16 11"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 20H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl border border-[#d7bf9b] text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable invoice body */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
            <div
              id="invoice-print-area"
              className="bg-white text-[#1a1a1a] rounded-xl sm:rounded-2xl p-3 sm:p-6 md:p-8 shadow-sm border border-gray-200 w-full max-w-[800px] mx-auto overflow-hidden"
              style={{
                fontFamily: "'Segoe UI', Arial, sans-serif",
              }}
            >
              {/* Header: Logo and Title */}
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  {invoiceData.logoUrl ? (
                    <img src={invoiceData.logoUrl} alt="Logo" className="h-8 sm:h-10 max-w-[120px] sm:max-w-[150px] object-contain" />
                  ) : (
                    <div
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-sm"
                      style={{ backgroundColor: "#8B1E3F" }}
                    >
                      S
                    </div>
                  )}
                  <div>
                    <span
                      className="text-base sm:text-xl font-extrabold tracking-tight"
                      style={{ color: "#8B1E3F" }}
                    >
                      Samagran
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <h1
                    className="text-lg sm:text-2xl font-black uppercase tracking-wider"
                    style={{ color: "#2f1618" }}
                  >
                    Tax Invoice
                  </h1>
                </div>
              </div>

              {/* Top Box: Seller Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 border border-gray-300 rounded-xl mb-4 sm:mb-5 overflow-hidden">
                <div className="col-span-1 md:col-span-2 p-3 sm:p-4 border-b md:border-b-0 md:border-r border-gray-300">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8B1E3F] mb-0.5 sm:mb-1">
                    Sold By / Seller:
                  </p>
                  <p className="font-extrabold text-[#1a1a1a] text-xs sm:text-sm mb-1">
                    <EditableField
                      name="sellerName"
                      value={invoiceData.sellerName}
                    />
                  </p>
                  <div className="text-[11px] sm:text-xs text-gray-600 mb-2 leading-relaxed whitespace-pre-wrap">
                    <EditableField
                      name="sellerAddress"
                      value={invoiceData.sellerAddress}
                      isTextArea={true}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-2 text-[9.5px] sm:text-[10px] text-gray-500 font-semibold border-t border-gray-100 pt-2">
                    {!isValEmpty(invoiceData.sellerGstin) || isEditing ? (
                      <p className="flex items-center gap-1">
                        GSTIN:{" "}
                        <strong className="text-gray-800">
                          <EditableField
                            name="sellerGstin"
                            value={invoiceData.sellerGstin}
                          />
                        </strong>
                      </p>
                    ) : null}
                    {!isValEmpty(invoiceData.sellerPan) || isEditing ? (
                      <p className="flex items-center gap-1">
                        PAN:{" "}
                        <strong className="text-gray-800">
                          <EditableField
                            name="sellerPan"
                            value={invoiceData.sellerPan}
                          />
                        </strong>
                      </p>
                    ) : null}
                    {!isValEmpty(invoiceData.sellerCin) || isEditing ? (
                      <p className="flex items-center gap-1">
                        CIN:{" "}
                        <strong className="text-gray-800">
                          <EditableField
                            name="sellerCin"
                            value={invoiceData.sellerCin}
                          />
                        </strong>
                      </p>
                    ) : null}
                    {!isValEmpty(invoiceData.sellerFssai) || isEditing ? (
                      <p className="flex items-center gap-1">
                        FSSAI No:{" "}
                        <strong className="text-gray-800">
                          <EditableField
                            name="sellerFssai"
                            value={invoiceData.sellerFssai}
                          />
                        </strong>
                      </p>
                    ) : null}
                    {(!isValEmpty(invoiceData.sellerEmail) || !isValEmpty(invoiceData.sellerPhone) || isEditing) ? (
                      <p className="sm:col-span-2 mt-1 flex flex-wrap items-center gap-1">
                        {!isValEmpty(invoiceData.sellerEmail) || isEditing ? (
                          <>
                            Email:{" "}
                            <strong className="text-gray-800 mr-2">
                              <EditableField
                                name="sellerEmail"
                                value={invoiceData.sellerEmail}
                              />
                            </strong>
                          </>
                        ) : null}
                        {!isValEmpty(invoiceData.sellerPhone) || isEditing ? (
                          <>
                            Contact:{" "}
                            <strong className="text-gray-800">
                              <EditableField
                                name="sellerPhone"
                                value={invoiceData.sellerPhone}
                              />
                            </strong>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="col-span-1 p-3 sm:p-4 bg-gray-50/50 flex flex-col justify-center items-center text-center">
                  <div className="w-full">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">
                      Invoice Number
                    </p>
                    <p className="text-xs font-bold text-gray-800 font-mono mt-0.5">
                      <EditableField
                        name="invoiceNumber"
                        value={invoiceData.invoiceNumber}
                        className="block text-center"
                      />
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle Box: Customer Details & Order details */}
              <div className="grid grid-cols-1 md:grid-cols-3 border border-gray-300 rounded-xl mb-4 sm:mb-5 overflow-hidden">
                <div className="col-span-1 md:col-span-2 p-3 sm:p-4 border-b md:border-b-0 md:border-r border-gray-300">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8B1E3F] mb-0.5 sm:mb-1">
                    Invoice To:
                  </p>
                  <p className="font-extrabold text-[#1a1a1a] text-xs sm:text-sm mb-1">
                    <EditableField
                      name="customerName"
                      value={invoiceData.customerName}
                    />
                  </p>
                  <div className="text-[11px] sm:text-xs text-gray-600 mb-2 leading-relaxed whitespace-pre-wrap">
                    <EditableField
                      name="customerAddress"
                      value={invoiceData.customerAddress}
                      isTextArea={true}
                    />
                  </div>

                  <div className="text-[9.5px] sm:text-[10px] text-gray-500 font-semibold border-t border-gray-100 pt-2">
                    <p className="flex items-center gap-1 mb-1">
                      Phone Number:{" "}
                      <strong className="text-gray-800">
                        <EditableField
                          name="customerPhone"
                          value={invoiceData.customerPhone}
                        />
                      </strong>
                    </p>
                    <p className="flex items-center gap-1">
                      Email ID:{" "}
                      <strong className="text-gray-800">
                        <EditableField
                          name="customerEmail"
                          value={invoiceData.customerEmail}
                        />
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="col-span-1 p-3 sm:p-4 bg-gray-50/50 flex flex-col gap-1.5 sm:gap-2 justify-center text-[11px] sm:text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-500 font-semibold">
                      Order ID:
                    </span>
                    <span className="font-bold text-gray-800 font-mono">
                      #{shortId(order._id)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-500 font-semibold whitespace-nowrap">
                      Invoice Date:
                    </span>
                    <span className="font-bold text-gray-800 text-right">
                      <EditableField
                        name="invoiceDate"
                        value={invoiceData.invoiceDate}
                        className="block text-right"
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-500 font-semibold whitespace-nowrap">
                      Place of Supply:
                    </span>
                    <span className="font-bold text-gray-800 text-right">
                      <EditableField
                        name="placeOfSupply"
                        value={invoiceData.placeOfSupply}
                        className="block text-right"
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-500 font-semibold whitespace-nowrap">
                      Payment Mode:
                    </span>
                    <span className="font-bold text-gray-800 text-right">
                      <EditableField
                        name="paymentMode"
                        value={invoiceData.paymentMode}
                        className="block text-right"
                      />
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Table (Read only for calculations logic) */}
              <div className="mb-4 sm:mb-5 overflow-x-auto rounded-xl border border-gray-300 w-full touch-pan-x bg-white">
                <table className="w-full text-[9px] sm:text-[10px] min-w-[640px] border-collapse">
                  <thead>
                    <tr
                      style={{ background: "#8B1E3F" }}
                      className="text-white"
                    >
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-center font-bold whitespace-nowrap">
                        Sr. No.
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-left font-bold whitespace-nowrap">
                        SKU/UPC
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-left font-bold whitespace-nowrap">
                        Item Description
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-left font-bold whitespace-nowrap">
                        HSN/SAC
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right font-bold whitespace-nowrap">
                        MRP (₹)
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right font-bold whitespace-nowrap">
                        Discount (₹)
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-center font-bold whitespace-nowrap">Qty</th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right font-bold whitespace-nowrap">
                        Taxable (₹)
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-center font-bold whitespace-nowrap">
                        GST (%)
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right font-bold whitespace-nowrap">
                        GST Amt (₹)
                      </th>
                      <th className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right font-bold whitespace-nowrap">
                        Total (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemDetails.map((item, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-[#fdf8f2]"}
                        style={{ borderTop: "1px solid #e5e7eb" }}
                      >
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-center text-gray-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-left font-mono text-[9px] sm:text-[10px] text-gray-700">
                          {item.sku}
                        </td>
                        <td
                          className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-left font-bold text-[#8B1E3F] max-w-[110px] sm:max-w-[130px] truncate"
                          title={item.name}
                        >
                          {item.name}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-left text-gray-600 font-semibold">
                          {item.hsn}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right text-gray-700 font-semibold">
                          {item.mrp.toFixed(2)}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right text-gray-700 font-semibold">
                          {item.discount.toFixed(2)}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-center font-bold text-gray-800">
                          {item.qty}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right text-gray-700 font-semibold">
                          {item.taxableValue.toFixed(2)}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-center text-gray-600 font-semibold">
                          {item.gstPercent}%
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right text-gray-700 font-semibold">
                          {item.gstAmount.toFixed(2)}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-right font-bold text-[#8B1E3F]">
                          {item.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <div className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-[9px] sm:text-[10px] font-bold text-[#8B1E3F] uppercase tracking-wider mb-1">
                      Amount in Words:
                    </p>
                    <p className="text-[11px] sm:text-xs font-bold text-gray-800 italic leading-relaxed">
                      {formatRupeesInWords(grandTotal)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs">
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Subtotal (MRP Total)</span>
                    <span className="text-gray-800 font-bold">
                      ₹{totalMRP.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Total Product Discount</span>
                    <span className="text-gray-800 font-bold">
                      -₹{totalDiscountVal.toFixed(2)}
                    </span>
                  </div>
                  {orderLevelDiscount > 0 && (
                    <div className="flex justify-between text-gray-500 font-semibold">
                      <span>Coupon/Offer Discount</span>
                      <span className="text-emerald-600 font-bold">
                        -₹{orderLevelDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Total Taxable Value</span>
                    <span className="text-gray-800 font-bold">
                      ₹{totalTaxableValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Total GST Amount</span>
                    <span className="text-gray-800 font-bold">
                      ₹{totalGstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Shipping Charges</span>
                    <span className="text-gray-800 font-bold">
                      ₹{deliveryFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-xs sm:text-sm font-extrabold">
                    <span className="text-[#2f1618]">Grand Total</span>
                    <span style={{ color: "#8B1E3F" }} className="text-base sm:text-lg">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Corporate Details Box (Only non-empty fields shown) */}
              {((!isValEmpty(invoiceData.companyName) || !isValEmpty(invoiceData.companyAddress) || !isValEmpty(invoiceData.companyCin) || !isValEmpty(invoiceData.companyPan) || !isValEmpty(invoiceData.companyFssai) || !isValEmpty(invoiceData.companyEmail) || !isValEmpty(invoiceData.companyPhone) || !isValEmpty(invoiceData.authorizedSignatory)) || isEditing) && (
                <div className="grid grid-cols-1 md:grid-cols-3 border border-gray-300 rounded-xl mb-4 sm:mb-5 overflow-hidden">
                  <div className="col-span-1 md:col-span-2 p-2.5 sm:p-3 text-[9.5px] sm:text-[10px] text-gray-500 leading-relaxed font-semibold border-b md:border-b-0 md:border-r border-gray-300">
                    {(!isValEmpty(invoiceData.companyName) || isEditing) && (
                      <p className="text-[10px] sm:text-[11px] font-bold text-[#8B1E3F] mb-0.5">
                        <EditableField
                          name="companyName"
                          value={invoiceData.companyName}
                        /> (Corporate Office)
                      </p>
                    )}
                    {(!isValEmpty(invoiceData.companyAddress) || isEditing) && (
                      <p className="mb-1">
                        Reg. Address:{" "}
                        <EditableField
                          name="companyAddress"
                          value={invoiceData.companyAddress}
                          isTextArea={true}
                        />
                      </p>
                    )}
                    {(!isValEmpty(invoiceData.companyCin) || !isValEmpty(invoiceData.companyPan) || !isValEmpty(invoiceData.companyFssai) || isEditing) && (
                      <p className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
                        {(!isValEmpty(invoiceData.companyCin) || isEditing) && (
                          <>
                            <span>CIN:</span>
                            <strong className="text-gray-800">
                              <EditableField
                                name="companyCin"
                                value={invoiceData.companyCin}
                              />
                            </strong>
                          </>
                        )}
                        {(!isValEmpty(invoiceData.companyPan) || isEditing) && (
                          <>
                            <span>| PAN:</span>
                            <strong className="text-gray-800">
                              <EditableField
                                name="companyPan"
                                value={invoiceData.companyPan}
                              />
                            </strong>
                          </>
                        )}
                        {(!isValEmpty(invoiceData.companyFssai) || isEditing) && (
                          <>
                            <span>| FSSAI:</span>
                            <strong className="text-gray-800">
                              <EditableField
                                name="companyFssai"
                                value={invoiceData.companyFssai}
                              />
                            </strong>
                          </>
                        )}
                      </p>
                    )}
                    {(!isValEmpty(invoiceData.companyEmail) || !isValEmpty(invoiceData.companyPhone) || isEditing) && (
                      <p className="mt-1 flex items-center flex-wrap gap-x-2">
                        {(!isValEmpty(invoiceData.companyEmail) || isEditing) && (
                          <>
                            <span>Customer Support:</span>
                            <strong className="text-gray-800 mr-2">
                              <EditableField
                                name="companyEmail"
                                value={invoiceData.companyEmail}
                              />
                            </strong>
                          </>
                        )}
                        {(!isValEmpty(invoiceData.companyPhone) || isEditing) && (
                          <>
                            <span>| Contact:</span>
                            <strong className="text-gray-800">
                              <EditableField
                                name="companyPhone"
                                value={invoiceData.companyPhone}
                              />
                            </strong>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 p-2.5 sm:p-3 flex flex-col justify-between items-center text-center">
                    {(!isValEmpty(invoiceData.authorizedSignatory) || isEditing) && (
                      <>
                        <span
                          style={{
                            fontFamily: "'Brush Script MT', cursive, sans-serif",
                          }}
                          className="text-base sm:text-lg text-gray-400 font-bold mt-1 block w-full"
                        >
                          <EditableField
                            name="authorizedSignatory"
                            value={invoiceData.authorizedSignatory}
                            className="block text-center"
                          />
                        </span>
                        <span className="text-[8.5px] sm:text-[9px] font-extrabold text-gray-500 uppercase tracking-wider border-t border-gray-100 w-full pt-1.5 mt-2">
                          Authorized Signatory
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Terms and conditions */}
              <div className="text-[8.5px] sm:text-[9px] text-gray-500 font-semibold leading-relaxed border-t border-gray-100 pt-2.5 sm:pt-3">
                <p className="font-bold text-gray-700 text-[10px] sm:text-xs mb-1">
                  Terms & Conditions:
                </p>
                <p className="mb-0.5">• All products sold on Samagran are offered by Lal Bhandar under the brand name "Samagran" and may be fulfilled directly or through authorised fulfilment partners.</p>
                <p className="mb-0.5">• Applicable taxes (including GST, if any) are reflected on this invoice.</p>
                <p className="mb-0.5">• Any product-related issue must be reported within 24 hours of delivery.</p>
                <p className="mb-0.5">• Refunds, replacements and cancellations are subject to Samagran's applicable policies.</p>
                <p className="mb-0.5">• Certain consumable, edible, customised and puja-related products may not be eligible for return or replacement unless received in a damaged, defective or incorrect condition.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Main Invoices page                                         */
/* ═══════════════════════════════════════════════════════════ */
export default function Invoices() {
  const isSuperAdmin = getStoredAdmin()?.role === "super";
  const [selectedIds, setSelectedIds] = useState([]);

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 10,
  });
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [generatingId, setGeneratingId] = useState("");

  // multiselection toggle
  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(orders.map((entry) => entry._id));
      return;
    }
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected orders?`))
      return;
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map((id) => API.delete(`/admin/orders/${id}`)),
      );
      setSelectedIds([]);
      toast.success("Selected orders deleted successfully.");
      fetchOrders({
        search: searchTerm,
        status: statusFilter,
        page: pagination.currentPage,
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete selected orders.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Fetch orders ──────────────────────────────────────── */
  const fetchOrders = useCallback(
    async ({ search = "", status = "all", page = 1 } = {}) => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get("/admin/orders", {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            status,
            page,
            limit: pageSize,
          },
        });
        const incoming = res.data?.data?.orders || [];
        const incomingPg = res.data?.data?.pagination || {};
        setOrders(incoming);
        setPagination({
          total: Number(incomingPg.total || incoming.length || 0),
          currentPage: Number(incomingPg.currentPage || page),
          totalPages: Number(incomingPg.totalPages || 1),
          limit: Number(incomingPg.limit || pageSize),
        });
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load orders.");
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders({
        search: searchTerm,
        status: statusFilter,
        page: pagination.currentPage,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchOrders, searchTerm, statusFilter, pagination.currentPage, pageSize]); // eslint-disable-line

  /* ── Generate Invoice (fetch full order → open preview) ── */
  const handleGenerate = async (order) => {
    if (!order?._id) return;
    try {
      setGeneratingId(order._id);
      setError("");
      const res = await API.get(`/admin/orders/${order._id}`);
      const full = res.data?.data?.order;
      if (full) setSelectedOrder(full);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load order details.");
    } finally {
      setGeneratingId("");
    }
  };

  const handlePageChange = (next) => {
    if (next < 1 || next > pagination.totalPages) return;
    setPagination((c) => ({ ...c, currentPage: next }));
  };

  /* ── Stats ────────────────────────────────────────────── */
  const totalRevenue = orders.reduce(
    (s, o) => s + Number(o.totalAmount || 0),
    0,
  );
  const delivered = orders.filter(
    (o) => o.orderStatus?.toLowerCase() === "delivered",
  ).length;
  const pending = orders.filter(
    (o) => o.paymentStatus?.toLowerCase() === "pending",
  ).length;

  return (
    <div className="space-y-6 text-[#2f1618] dark:text-[#fff3dc]">
      {/* ── Header ───────────────────────────────────────── */}
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--admin-primary)]">
              Orders &amp; Sales
            </p>
            <h2 className="mt-2 text-2xl font-bold">Invoice Generator</h2>
            <p className="mt-1 text-sm text-[#6e4b40] dark:text-[#f7e3c0]/75">
              Generate and download PDF invoices for any order.
            </p>
          </div>

          {/* Stats cards */}
          <div className="flex gap-3 flex-wrap">
            {[
              {
                label: "Total Orders",
                value: pagination.total,
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-500/10",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                label: "Delivered",
                value: delivered,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-500/10",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M5 13L9 17L19 7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                label: "Pending Payment",
                value: pending,
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-50 dark:bg-amber-500/10",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M12 6V12L16 14"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                ),
              },
              {
                label: "Revenue",
                value: fmt(totalRevenue),
                color: "text-[#8B1E3F] dark:text-[#f7a8b8]",
                bg: "bg-rose-50 dark:bg-rose-500/10",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 6v2M12 16v2M8.5 9.5a3.5 1.5 0 117 0c0 1.5-7 1.5-7 3a3.5 1.5 0 107 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
            ].map(({ label, value, color, bg, icon }) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-2xl border border-[var(--admin-border)] ${bg} px-4 py-3 min-w-[130px]`}
              >
                <span className={color}>{icon}</span>
                <div>
                  <p className={`text-base font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {/* ── Filters + Table ───────────────────────────────── */}
      <section className="rounded-[30px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[var(--admin-shadow)]">
        {/* Search + Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-xl border border-[#d7c3a3] bg-white/70 px-3 dark:border-white/10 dark:bg-white/5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 shrink-0 text-[var(--admin-primary)]"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M21 21L16.65 16.65"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Order ID, Customer Name, or Email…"
              className="h-11 w-full bg-transparent text-sm text-[#2f1618] outline-none placeholder:text-[#8c7461] dark:text-[#fff3dc]"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPagination((c) => ({ ...c, currentPage: 1 }));
            }}
            className="h-11 rounded-xl border border-[#d7c3a3] bg-white px-3 text-sm outline-none dark:border-white/20 dark:bg-[#181c24] dark:text-white"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            type="button"
            onClick={() =>
              fetchOrders({
                search: searchTerm,
                status: statusFilter,
                page: pagination.currentPage,
              })
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#d7bf9b] px-3 py-2 text-sm font-medium text-[#6f3945] hover:bg-[#8B1E3F]/10 dark:border-white/20 dark:text-[#f7e3c0] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M4 4V9H9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 20V15H15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20.49 9A9 9 0 0 0 5.64 5.64L4 9M4 15l1.64 3.36A9 9 0 0 0 20.36 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Refresh
          </button>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-[#8B1E3F]/20 border-t-[#8B1E3F] animate-spin" />
            <p className="text-sm text-[#7b5a4b] dark:text-[#dbcdb8]/70">
              Loading orders…
            </p>
          </div>
        ) : !orders.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-12 w-12 text-[#d8c4a5] dark:text-white/10"
            >
              <path
                d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-[#7b5a4b] dark:text-[#dbcdb8]/70">
              No orders found.
            </p>
          </div>
        ) : (
          <>
            {/* Order count badge */}
            <div className="mb-3 flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-[var(--admin-primary)]"
              >
                <path
                  d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm font-semibold">
                Orders ({pagination.total})
              </span>
            </div>

            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e6d8c5] text-xs uppercase tracking-[0.18em] text-[#7f5a4f] dark:border-white/10 dark:text-[#e7c98b]">
                    <th className="px-4 py-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={
                          orders.length > 0 &&
                          selectedIds.length === orders.length
                        }
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Order ID</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    {isSuperAdmin && <th className="px-4 py-3 font-semibold">Vendor Details</th>}
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="border-b border-[#f0e3d1] align-middle last:border-none dark:border-white/10 hover:bg-[#fdf8f2] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, order._id]);
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter((id) => id !== order._id),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded-[4px] border border-[#d7c3a3]"
                        />
                      </td>

                      {/* Order ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-[#6f3945] dark:text-[#f7e3c0]">
                          …{shortId(order._id)}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                          {order.user?.name || order.address?.name || "—"}
                        </p>
                        <p className="text-[11px] text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                          {order.user?.email || order.address?.phone || "—"}
                        </p>
                      </td>

                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          {order.vendorId ? (
                            <>
                              <p className="font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                                {order.vendorId.businessName || order.vendorId.name || "N/A"}
                              </p>
                              <p className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70 font-medium">
                                ID: {String(order.vendorId._id || "").slice(-6).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                                {[order.vendorId.address?.city, order.vendorId.address?.state].filter(Boolean).join(", ")}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-[#7b5a4b] dark:text-[#dbcdb8]/70">Super Admin / System</span>
                          )}
                        </td>
                      )}

                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-[#7b5a4b] dark:text-[#dbcdb8]/70">
                        {fmtDate(order.createdAt)}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 font-semibold text-[#2f1618] dark:text-[#fff3dc]">
                        {fmt(order.totalAmount)}
                      </td>

                      {/* Payment status */}
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentColor(order.paymentStatus)}`}
                        >
                          {order.paymentStatus || "Pending"}
                        </span>
                      </td>

                      {/* Order status */}
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor(order.orderStatus)}`}
                        >
                          {order.orderStatus || "Placed"}
                        </span>
                      </td>

                      {/* Generate button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleGenerate(order)}
                          disabled={generatingId === order._id}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow transition-all disabled:opacity-60 hover:scale-[1.03] active:scale-95"
                          style={{
                            background:
                              "linear-gradient(135deg,#8B1E3F,#a0233f)",
                          }}
                        >
                          {generatingId === order._id ? (
                            <>
                              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              Loading…
                            </>
                          ) : (
                            <>
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-3.5 w-3.5"
                              >
                                <path
                                  d="M9 12H15M9 8H15M9 16H12M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4C7 4 7 2 12 2C17 2 17 4 17 4M7 4H17"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Generate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={pagination.currentPage}
              pageSize={pageSize}
              total={pagination.total}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPagination((c) => ({ ...c, currentPage: 1 }));
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </>
        )}
      </section>

      {selectedOrder && (
        <InvoicePreview
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={() => {
            fetchOrders({
              search: searchTerm,
              status: statusFilter,
              page: pagination.currentPage,
            });
            handleGenerate(selectedOrder);
          }}
        />
      )}
    </div>
  );
}
