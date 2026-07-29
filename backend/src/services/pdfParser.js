'use strict';

/**
 * pdfParser.js
 * ─────────────
 * Extracts and categorizes transactions from a PDF buffer.
 *
 * Strategy cascade:
 *   1. pdf-parse  → text extraction (fast, digital PDFs)
 *   2. Google Cloud Vision documentTextDetection (scanned / image-heavy PDFs)
 *
 * Google Cloud Vision is only attempted if GOOGLE_APPLICATION_CREDENTIALS is set
 * AND the extracted text is too sparse to be useful.
 *
 * Returns:
 *   { transactions, confidence, statementStartDate, statementEndDate, totalCount }
 */

const pdfParse = require('pdf-parse');
const config = require('../config');

// Minimum average characters per page to trust pdfParse extraction
const MIN_AVG_CHARS_PER_PAGE = 100;

// ─── Transaction Categoriser ─────────────────────────────────────────────────

const INCOME_KEYWORDS = [
  'salary', 'salaries', 'credit', 'received', 'receipt',
  'deposit', 'interest', 'dividend', 'cashback', 'refund',
  'neft cr', 'rtgs cr', 'imps cr', 'upi cr',
];
const BOUNCE_KEYWORDS = [
  'bounce', 'penalty', 'return', 'failed', 'dishonor', 'chg', 'charge',
  'insufficient', 'inward return',
];
const LOAN_KEYWORDS = ['emi', 'loan', 'credit card', 'mortgage', 'nbfc', 'finance', 'repay'];
const ESSENTIAL_KEYWORDS = [
  'bill', 'electricity', 'water', 'gas', 'rent', 'groceries',
  'recharge', 'wifi', 'broadband', 'utility', 'medical', 'hospital', 'pharmacy',
  'insurance', 'tax', 'govt',
];

function categorise(description, transactionType) {
  const d = (description || '').toLowerCase();
  const t = (transactionType || '').toLowerCase();

  if (t === 'credit' || INCOME_KEYWORDS.some((k) => d.includes(k))) return 'income';
  if (BOUNCE_KEYWORDS.some((k) => d.includes(k))) return 'bounce_penalty';
  if (LOAN_KEYWORDS.some((k) => d.includes(k))) return 'loan_repayment';
  if (ESSENTIAL_KEYWORDS.some((k) => d.includes(k))) return 'essential_spend';
  return 'discretionary_spend';
}

// ─── Regex Patterns ──────────────────────────────────────────────────────────

// Date formats: DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, DD MMM YYYY, MMM DD, YYYY, YYYY-MM-DD, etc.
const DATE_REGEX =
  /\b(?:\d{1,2}[\/\-\.](?:\d{1,2}|[A-Za-z]{3,9})[\/\-\.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/gi;

// Amount: requiring decimals OR currency symbol OR isolated monetary amount with 2 decimals
const AMOUNT_REGEX = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)|(?:\b([\d,]+\.\d{2})\b)/gi;

const CREDIT_INDICATORS = [
  'received', 'credit', 'cr', 'cashback', 'refund', 'deposit', 'inward', 'credited', 'from',
];
const DEBIT_INDICATORS = [
  'paid', 'debit', 'dr', 'sent', 'transfer', 'payment', 'withdrawal', 'debited', 'to',
];

/**
 * Attempt to parse ISO date from various raw formats.
 */
function normaliseDate(raw) {
  if (!raw) return null;
  const cleanRaw = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanRaw)) return cleanRaw;

  const patterns = [
    { regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/, fn: (m) => `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
    { regex: /^(\d{1,2})[\/\-\.]([A-Za-z]{3,9})[\/\-\.](\d{2,4})$/, fn: (m) => parseMonthDate(m[1], m[2], m[3]) },
    { regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, fn: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
    { regex: /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/, fn: (m) => parseMonthDate(m[1], m[2], m[3]) },
    { regex: /^([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{2,4})$/, fn: (m) => parseMonthDate(m[2], m[1], m[3]) },
  ];

  for (const { regex, fn } of patterns) {
    const match = cleanRaw.match(regex);
    if (match) {
      const result = fn(match);
      if (result) return result;
    }
  }
  return cleanRaw;
}

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseMonthDate(day, monthStr, year) {
  const monthKey = monthStr.toLowerCase().substring(0, 3);
  const month = MONTHS[monthKey];
  if (!month) return null;
  const fullYear = year.length === 2 ? '20' + year : year;
  return `${fullYear}-${month}-${day.toString().padStart(2, '0')}`;
}

// ─── Text → Transaction Parser ────────────────────────────────────────────────

/**
 * Parse raw text lines into transaction objects.
 * Supports PhonePe, GPay, Paytm, and standard bank formats.
 */
function parseTextToTransactions(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const transactions = [];

  // Strategy A: Line / Multi-line scan with Date detection
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    DATE_REGEX.lastIndex = 0;
    const dateMatch = DATE_REGEX.exec(line);
    if (!dateMatch) continue;

    const rawDate = dateMatch[0];
    const isoDate = normaliseDate(rawDate);

    // Look for amounts in current line and surrounding 2 lines
    const blockLines = lines.slice(Math.max(0, i - 1), Math.min(i + 3, lines.length));
    const blockText = blockLines.join(' ');

    AMOUNT_REGEX.lastIndex = 0;
    const amountMatches = [...blockText.matchAll(AMOUNT_REGEX)];
    if (!amountMatches.length) continue;

    let amount = null;
    for (const m of amountMatches) {
      const rawVal = m[1] || m[2];
      if (!rawVal) continue;
      const val = parseFloat(rawVal.replace(/,/g, ''));
      if (val > 0 && val < 50_000_000 && val !== parseInt(rawDate.replace(/\D/g, ''), 10)) {
        amount = val;
        break;
      }
    }
    if (!amount) continue;

    const blockLower = blockText.toLowerCase();
    const isCredit = CREDIT_INDICATORS.some((k) => blockLower.includes(k));
    const isDebit = DEBIT_INDICATORS.some((k) => blockLower.includes(k));
    const transactionType = isCredit && !isDebit ? 'Credit' : 'Debit';

    let desc = blockText
      .replace(DATE_REGEX, '')
      .replace(AMOUNT_REGEX, '')
      .replace(/\b(upi|neft|rtgs|imps|atm|ref|no|id|transaction|txn|paid|received|debited|credited|from|to)\b[:\s#\d]*/gi, '')
      .replace(/[|\/\\*]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 80);

    if (!desc || desc.length < 3) desc = 'UPI/Bank Transaction';

    const category = categorise(desc, transactionType);

    // Avoid duplicate transactions on same date + amount + type
    const isDup = transactions.some(
      (t) => t.date === isoDate && t.amount === amount && t.transaction_type === transactionType
    );

    if (!isDup) {
      transactions.push({
        date: isoDate,
        description: desc,
        amount,
        transaction_type: transactionType,
        category,
        running_balance: null,
      });
    }
  }

  // Strategy B: Fallback parser if no dates found (e.g. PhonePe/GPay statements structured as "Paid ₹500 to XYZ")
  if (transactions.length === 0) {
    const upiPattern = /(?:Paid|Sent|Received|Transfer|Debited|Credited)\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:to|from|for)?\s*([A-Za-z0-9\s\.\@\-]{3,40})/gi;
    let match;
    const todayIso = new Date().toISOString().split('T')[0];

    while ((match = upiPattern.exec(text)) !== null) {
      const amtVal = parseFloat(match[1].replace(/,/g, ''));
      if (amtVal > 0 && amtVal < 50_000_000) {
        const lineText = match[0].toLowerCase();
        const isCredit = CREDIT_INDICATORS.some((k) => lineText.includes(k));
        const transactionType = isCredit ? 'Credit' : 'Debit';
        const desc = match[2].trim() || 'UPI Payment';

        transactions.push({
          date: todayIso,
          description: desc,
          amount: amtVal,
          transaction_type: transactionType,
          category: categorise(desc, transactionType),
          running_balance: null,
        });
      }
    }
  }

  return transactions;
}

// ─── Google Cloud Vision OCR ──────────────────────────────────────────────────

async function ocrWithGoogleVision(pdfBuffer) {
  try {
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient({
      projectId: config.googleProjectId || undefined,
      keyFilename: config.googleCredentials || undefined,
    });

    const [result] = await client.documentTextDetection({
      image: { content: pdfBuffer },
      imageContext: { languageHints: ['en'] },
    });

    const fullText = result.fullTextAnnotation?.text || '';
    console.log(`[pdfParser] Google Vision OCR: extracted ${fullText.length} chars`);
    return fullText;
  } catch (err) {
    console.warn('[pdfParser] Google Vision OCR failed:', err.message);
    return '';
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Extract transactions from an in-memory PDF buffer.
 *
 * @param {Buffer} pdfBuffer
 * @param {string|null} [password] - PDF password if encrypted
 * @returns {Promise<{transactions, confidence, statementStartDate, statementEndDate, totalCount}>}
 */
async function extractTransactionsFromBuffer(pdfBuffer, password = null) {
  let fullText = '';

  // ── Strategy 1: pdf-parse ─────────────────────────────────────────────────
  try {
    const options = {};
    if (password) options.password = password;

    const parsed = await pdfParse(pdfBuffer, options);
    fullText = parsed.text || '';
    const pageCount = parsed.numpages || 1;
    const avgCharsPerPage = fullText.length / pageCount;

    console.log(`[pdfParser] pdf-parse: ${fullText.length} chars across ${pageCount} pages (avg ${Math.round(avgCharsPerPage)}/page)`);

    // If text is too sparse, it's likely a scanned PDF → try OCR
    if (avgCharsPerPage < MIN_AVG_CHARS_PER_PAGE && config.googleCredentials) {
      console.log('[pdfParser] Sparse text detected — attempting Google Cloud Vision OCR');
      const ocrText = await ocrWithGoogleVision(pdfBuffer);
      if (ocrText.length > fullText.length) {
        fullText = ocrText;
      }
    }
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('password')) {
      const e = new Error('This PDF is password-protected. Please provide the PDF password.');
      e.status = 400;
      e.code = 'PDF_PASSWORD_REQUIRED';
      throw e;
    }

    // pdf-parse failed entirely → try OCR as fallback
    if (config.googleCredentials) {
      console.warn('[pdfParser] pdf-parse failed, falling back to Google Vision OCR:', err.message);
      fullText = await ocrWithGoogleVision(pdfBuffer);
    } else {
      const e = new Error('PDF parsing failed. Please try again with a digital (non-scanned) PDF.');
      e.status = 500;
      e.code = 'EXTRACTION_ERROR';
      throw e;
    }
  }

  if (!fullText || fullText.trim().length < 50) {
    const e = new Error(
      'No readable text found in the PDF. Please upload an official digital statement (not a scanned image).'
    );
    e.status = 400;
    e.code = 'EXTRACTION_ERROR';
    throw e;
  }

  // ── Parse extracted text into transactions ─────────────────────────────────
  const transactions = parseTextToTransactions(fullText);

  if (transactions.length === 0) {
    console.warn('[pdfParser] 0 transactions found. Extracted PDF text sample:\n', fullText.slice(0, 500));
    const e = new Error(
      'No transactions could be extracted from this statement. ' +
      'ScoreZero supports PhonePe, Google Pay, and standard bank statement PDFs.'
    );
    e.status = 400;
    e.code = 'NO_TRANSACTIONS_FOUND';
    throw e;
  }

  // ── Statement date range ──────────────────────────────────────────────────
  const dates = transactions.map((t) => t.date).filter(Boolean).sort();
  const statementStartDate = dates[0] || null;
  const statementEndDate = dates[dates.length - 1] || null;

  // ── Confidence: low if fewer than 3 transactions ──────────────────────────
  const confidence = transactions.length >= 3 ? 0.92 : 0.50;
  const lowConfidence = confidence < 0.90;

  console.log(
    `[pdfParser] Extracted ${transactions.length} transactions. ` +
    `Date range: ${statementStartDate} → ${statementEndDate}. ` +
    `Confidence: ${confidence.toFixed(2)}`
  );

  return {
    transactions,
    confidence,
    lowConfidence,
    statementStartDate,
    statementEndDate,
    totalCount: transactions.length,
  };
}

module.exports = { extractTransactionsFromBuffer };
