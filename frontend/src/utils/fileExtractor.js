/**
 * fileExtractor.js
 * Extracts readable text from any uploaded file.
 * Supported: PDF, images (base64 preview), DOCX, XLSX/CSV, JSON, plain text, code files.
 */

const MAX_TEXT_CHARS = 40_000; // prevent context overflow

// ── Helpers ───────────────────────────────────────────────────────────────

function readAsArrayBuffer(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Failed to read file as ArrayBuffer"));
    r.readAsArrayBuffer(file);
  });
}

function readAsText(file, encoding = "utf-8") {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Failed to read file as text"));
    r.readAsText(file, encoding);
  });
}

function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Failed to read file as DataURL"));
    r.readAsDataURL(file);
  });
}

function truncate(str) {
  if (str.length <= MAX_TEXT_CHARS) return str;
  return str.slice(0, MAX_TEXT_CHARS) + `\n\n[... truncated — ${str.length} total chars]`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// ── PDF extraction via pdf.js CDN ─────────────────────────────────────────

async function extractPDF(file) {
  // Dynamically load pdf.js from CDN if not already loaded
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = res;
      script.onerror = rej;
      document.head.appendChild(script);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const texts = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    texts.push(`--- Page ${i} ---\n${pageText}`);
  }

  return {
    text: truncate(texts.join("\n\n")),
    meta: `${numPages} page${numPages !== 1 ? "s" : ""}`,
  };
}

// ── DOCX extraction via mammoth CDN ──────────────────────────────────────

async function extractDOCX(file) {
  if (!window.mammoth) {
    await new Promise((res, rej) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
      script.onload = res;
      script.onerror = rej;
      document.head.appendChild(script);
    });
  }

  const arrayBuffer = await readAsArrayBuffer(file);
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return {
    text: truncate(result.value),
    meta: result.messages.length > 0 ? `${result.messages.length} warning(s)` : "",
  };
}

// ── XLSX / CSV extraction via SheetJS CDN ─────────────────────────────────

async function extractSpreadsheet(file) {
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = res;
      script.onerror = rej;
      document.head.appendChild(script);
    });
  }

  const arrayBuffer = await readAsArrayBuffer(file);
  const workbook = window.XLSX.read(arrayBuffer, { type: "array" });
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = window.XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
  }

  return {
    text: truncate(sheets.join("\n\n")),
    meta: `${workbook.SheetNames.length} sheet(s)`,
  };
}

// ── Image — store as base64 preview ──────────────────────────────────────

async function extractImage(file) {
  const dataUrl = await readAsDataURL(file);
  // Store small thumbnail for display; send description to AI
  return {
    text: `[Image file: ${file.name} (${formatSize(file.size)}) — attached as base64 for vision analysis]`,
    preview: dataUrl, // used for thumbnail in FileChip
    isImage: true,
    dataUrl,
  };
}

// ── Plain text / code ─────────────────────────────────────────────────────

async function extractText(file) {
  const text = await readAsText(file);
  return { text: truncate(text) };
}

// ── Main entry point ──────────────────────────────────────────────────────

export async function extractFileText(file) {
  const name = file.name || "";
  const type = file.type || "";
  const ext = name.split(".").pop().toLowerCase();

  let result = { text: "", meta: "", preview: null, isImage: false, dataUrl: null };

  try {
    if (type === "application/pdf" || ext === "pdf") {
      const r = await extractPDF(file);
      result = { ...result, ...r };
    } else if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx" || ext === "doc"
    ) {
      const r = await extractDOCX(file);
      result = { ...result, ...r };
    } else if (
      type.includes("spreadsheet") ||
      type === "application/vnd.ms-excel" ||
      ext === "xlsx" || ext === "xls" || ext === "csv"
    ) {
      const r = await extractSpreadsheet(file);
      result = { ...result, ...r };
    } else if (type.startsWith("image/")) {
      const r = await extractImage(file);
      result = { ...result, ...r };
    } else {
      // Plain text, JSON, Markdown, code files, etc.
      const r = await extractText(file);
      result = { ...result, ...r };
    }
  } catch (e) {
    result.text = `[Could not extract content from ${name}: ${e.message}]`;
    result.error = true;
  }

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    ext,
    meta: result.meta || "",
    text: result.text,
    preview: result.preview || null,
    isImage: result.isImage || false,
    dataUrl: result.dataUrl || null,
    error: result.error || false,
  };
}