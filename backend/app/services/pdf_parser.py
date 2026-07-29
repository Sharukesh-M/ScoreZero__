import re
import io
import logging
from datetime import datetime
import pdfplumber
from pypdf import PdfReader
from app.services.glm_ocr_service import ocr_image_with_glm

logger = logging.getLogger(__name__)

# Date Regex Patterns: DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, DD MMM YYYY, 01Apr,2026, YYYY-MM-DD, etc.
DATE_REGEX = re.compile(
    r'\b(?:\d{1,2}[\/\-\.](?:\d{1,2}|[A-Za-z]{3,9})[\/\-\.]\d{2,4}|\d{1,2}\s*[A-Za-z]{3,9},?\s*\d{2,4}|[A-Za-z]{3,9}\s*\d{1,2},?\s*\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b',
    re.IGNORECASE
)

# Isolated Amount Regex: matches full numeric string including all digits before/after comma (e.g. Rs.1,119 -> 1119)
ISOLATED_AMOUNT_REGEX = re.compile(
    r'(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)',
    re.IGNORECASE
)

CREDIT_KEYWORDS = ['received', 'credit', 'cr', 'cashback', 'refund', 'deposit', 'inward', 'credited', 'from', 'received from']
DEBIT_KEYWORDS = ['paid', 'debit', 'dr', 'sent', 'transfer', 'payment', 'withdrawal', 'debited', 'to', 'paid to']

INCOME_KEYWORDS = ['salary', 'salaries', 'credit', 'received', 'receipt', 'deposit', 'interest', 'dividend', 'cashback', 'refund', 'neft cr', 'rtgs cr', 'imps cr', 'upi cr']
BOUNCE_KEYWORDS = ['bounce', 'penalty', 'return', 'failed', 'dishonor', 'chg', 'charge', 'insufficient', 'inward return', 'ecs bounce', 'chrg-bounce']
LOAN_KEYWORDS = ['emi', 'loan', 'credit card', 'mortgage', 'nbfc', 'finance', 'repay']
ESSENTIAL_KEYWORDS = ['bill', 'electricity', 'water', 'gas', 'rent', 'groceries', 'recharge', 'wifi', 'broadband', 'utility', 'medical', 'hospital', 'pharmacy', 'insurance', 'tax', 'govt']

MONTHS = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
}

SELF_TRANSFER_REGEX = re.compile(
    r'(?:self\s+transfer\s+(?:to|from)|transfer\s+to\s+self|self-transfer|self\s+pay|self\s+account\s+transfer|internal\s+transfer)',
    re.IGNORECASE
)

def categorise(description: str, transaction_type: str) -> str:
    d = (description or '').lower()
    t = (transaction_type or '').lower()

    if SELF_TRANSFER_REGEX.search(d):
        return 'internal_transfer'
    if t == 'credit' or any(k in d for k in INCOME_KEYWORDS):
        return 'income'
    if any(k in d for k in BOUNCE_KEYWORDS):
        return 'bounce_penalty'
    if any(k in d for k in LOAN_KEYWORDS):
        return 'loan_repayment'
    if any(k in d for k in ESSENTIAL_KEYWORDS):
        return 'essential_spend'
    return 'discretionary_spend'

def parse_month_date(day: str, month_str: str, year: str) -> str:
    month_key = month_str.lower()[:3]
    month = MONTHS.get(month_key)
    if not month:
        return None
    full_year = '20' + year if len(year) == 2 else year
    return f"{full_year}-{month}-{day.zfill(2)}"

def normalise_date(raw: str) -> str:
    if not raw:
        return None
    clean = raw.replace(',', ' ').strip()
    if re.match(r'^\d{4}-\d{2}-\d{2}$', clean):
        return clean

    m1 = re.match(r'^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$', clean)
    if m1:
        d, m, y = m1.groups()
        y_full = '20' + y if len(y) == 2 else y
        return f"{y_full}-{m.zfill(2)}-{d.zfill(2)}"

    m2 = re.match(r'^(\d{1,2})[\/\-\.]([A-Za-z]{3,9})[\/\-\.](\d{2,4})$', clean)
    if m2:
        return parse_month_date(m2.group(1), m2.group(2), m2.group(3))

    m3 = re.match(r'^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$', clean)
    if m3:
        y, m, d = m3.groups()
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"

    m4 = re.match(r'^(\d{1,2})\s*([A-Za-z]{3,9})\s*,?\s*(\d{2,4})$', clean)
    if m4:
        return parse_month_date(m4.group(1), m4.group(2), m4.group(3))

    m5 = re.match(r'^([A-Za-z]{3,9})\s*(\d{1,2})\s*,?\s*(\d{2,4})$', clean)
    if m5:
        return parse_month_date(m5.group(2), m5.group(1), m5.group(3))

    return clean

def extract_amount_from_cell(text: str) -> float:
    """
    Parses isolated amount string without truncating multi-digit numbers before commas.
    Example: 'Rs.1,119' -> 1119.0 (NOT 1)
    """
    if not text:
        return None
    matches = ISOLATED_AMOUNT_REGEX.findall(text)
    for val_str in matches:
        if not val_str:
            continue
        try:
            clean_str = val_str.replace(',', '')
            val = float(clean_str)
            if val > 0 and val < 50000000:
                return val
        except ValueError:
            continue
    return None

def detect_declared_row_count(text: str) -> int:
    """
    Detects declared transaction or payment count from PDF header metadata.
    Example: '10 Payments received', 'Total 10 transactions', '10 Records found'
    """
    if not text:
        return None
    m1 = re.search(r'(\d+)\s*(?:Payments?\s*(?:received|made)|transactions?|records?|entries|rows)', text, re.IGNORECASE)
    if m1:
        return int(m1.group(1))
    m2 = re.search(r'(?:total\s*(?:records?|transactions?|entries|rows)|count)\s*[:=]?\s*(\d+)', text, re.IGNORECASE)
    if m2:
        return int(m2.group(1))
    return None

def extract_tables_and_text(pdf_bytes: bytes, password: str = None):
    text_chunks = []
    tables = []

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_chunks.append(t)
                page_tables = page.extract_tables()
                if page_tables:
                    for tbl in page_tables:
                        if tbl:
                            tables.append(tbl)
    except Exception as e:
        logger.warning(f"[pdf_parser] pdfplumber table extraction warning: {e}")

    full_text = "\n".join(text_chunks)
    return full_text, tables

FINANCIAL_LINE_KEYWORDS = [
    'paid to', 'received from', 'debited', 'credited', 'upi', 'neft', 'rtgs', 'imps',
    'transfer', 'ref no', 'txn id', 'balance', 'cr', 'dr', 'inr', '₹', 'rs', 'rs.',
    'money paid', 'money received', 'payment to', 'payment from', 'account', 'cashback',
    'refund', 'withdrawal', 'deposit', 'autopay', 'charges', 'sent', 'received', 'paid'
]

def parse_tables_and_text_to_transactions(text: str, tables: list) -> list:
    """
    Layout-aware extraction.
    Parses 2D tables first, then falls back to block parsing.
    Validates required fields: date, amount, tag/type for every row.
    """
    transactions = []

    # 1. Parse Structured 2D Tables from pdfplumber
    for tbl in tables:
        for row in tbl:
            if not row or not isinstance(row, list):
                continue
            row_str = " | ".join([str(cell or '').strip() for cell in row if str(cell or '').strip()])
            if not row_str:
                continue

            row_lower = row_str.lower()
            if not any(k in row_lower for k in FINANCIAL_LINE_KEYWORDS):
                continue

            date_match = DATE_REGEX.search(row_str)
            amount_val = None
            for cell in row:
                if cell:
                    amt = extract_amount_from_cell(str(cell))
                    if amt:
                        amount_val = amt
                        break

            if date_match and amount_val:
                iso_date = normalise_date(date_match.group(0))
                is_credit = any(k in row_lower for k in CREDIT_KEYWORDS)
                is_debit = any(k in row_lower for k in DEBIT_KEYWORDS)
                tx_type = 'Credit' if (is_credit and not is_debit) else 'Debit'

                # Extract counterparty & UPI ref
                upi_ref = ""
                ref_match = re.search(r'(?:UPI\s*Ref\s*No|Ref\s*No|Txn\s*ID)[:\s]*([A-Za-z0-9]+)', row_str, re.IGNORECASE)
                if ref_match:
                    upi_ref = ref_match.group(1)

                desc = re.sub(DATE_REGEX, '', row_str)
                desc = re.sub(ISOLATED_AMOUNT_REGEX, '', desc)
                desc = re.sub(r'\b(upi|neft|rtgs|imps|ref|no|id|transaction|txn|paid|received|debited|credited|from|to)\b[:\s#\d]*', '', desc, flags=re.IGNORECASE)
                desc = re.sub(r'[|\/\\*]+', ' ', desc)
                desc = re.sub(r'\s{2,}', ' ', desc).strip()[:80]
                if not desc or len(desc) < 3:
                    desc = 'UPI/Bank Payment'

                # Check duplicate
                if not any(t['date'] == iso_date and t['amount'] == amount_val and t['transaction_type'] == tx_type for t in transactions):
                    transactions.append({
                        "date": iso_date,
                        "description": desc,
                        "amount": amount_val,
                        "transaction_type": tx_type,
                        "upi_ref": upi_ref,
                        "category": categorise(desc, tx_type),
                        "running_balance": None
                    })

    # 2. Block/Line-based Parser (for card layouts or text streams)
    lines = [l.strip() for l in (text or '').split('\n') if l.strip()]
    for i, line in enumerate(lines):
        date_match = DATE_REGEX.search(line)
        if not date_match:
            continue

        block_lines = lines[max(0, i - 1):min(len(lines), i + 3)]
        block_text = ' '.join(block_lines)
        block_lower = block_text.lower()

        # FINANCIAL CONTEXT CHECK: Block must contain payment/banking keywords
        if not any(k in block_lower for k in FINANCIAL_LINE_KEYWORDS):
            continue

        raw_date = date_match.group(0)
        iso_date = normalise_date(raw_date)

        amount_val = extract_amount_from_cell(block_text)
        if not amount_val:
            continue

        is_credit = any(k in block_lower for k in CREDIT_KEYWORDS)
        is_debit = any(k in block_lower for k in DEBIT_KEYWORDS)
        tx_type = 'Credit' if (is_credit and not is_debit) else 'Debit'

        desc = re.sub(DATE_REGEX, '', block_text)
        desc = re.sub(ISOLATED_AMOUNT_REGEX, '', desc)
        desc = re.sub(r'\b(upi|neft|rtgs|imps|ref|no|id|transaction|txn|paid|received|debited|credited|from|to)\b[:\s#\d]*', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'[|\/\\*]+', ' ', desc)
        desc = re.sub(r'\s{2,}', ' ', desc).strip()[:80]
        if not desc or len(desc) < 3:
            desc = 'UPI/Bank Payment'

        if not any(t['date'] == iso_date and t['amount'] == amount_val and t['transaction_type'] == tx_type for t in transactions):
            transactions.append({
                "date": iso_date,
                "description": desc,
                "amount": amount_val,
                "transaction_type": tx_type,
                "category": categorise(desc, tx_type),
                "running_balance": None
            })

    return transactions

def extract_declared_header_totals(text: str) -> dict:
    """
    Extracts declared total income (Received) and total expense (Sent/Paid) from PDF headers.
    Examples: 'Money Paid: ₹55,726.38', 'Money Received: ₹59,499.00'
    """
    if not text:
        return {"declared_income": None, "declared_expense": None}

    declared_income = None
    declared_expense = None

    m_inc = re.search(r'(?:Money\s*Received|Total\s*Received|Total\s*Credits?|Received\s*Total)\s*[:\s]*[₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)', text, re.IGNORECASE)
    if m_inc:
        try:
            declared_income = float(m_inc.group(1).replace(',', ''))
        except ValueError:
            pass

    m_exp = re.search(r'(?:Money\s*Paid|Total\s*Paid|Total\s*Debits?|Sent\s*Total|Money\s*Sent)\s*[:\s]*[₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)', text, re.IGNORECASE)
    if m_exp:
        try:
            declared_expense = float(m_exp.group(1).replace(',', ''))
        except ValueError:
            pass

    return {
        "declared_income": declared_income,
        "declared_expense": declared_expense
    }

def reconcile_header_totals(transactions: list, full_text: str) -> dict:
    """
    Task 2 Gate: Reconciles computed non-transfer totals against statement's declared header totals.
    Fails if discrepancy > 2%.
    """
    header_totals = extract_declared_header_totals(full_text)
    declared_income = header_totals.get("declared_income")
    declared_expense = header_totals.get("declared_expense")

    valid_txs = [t for t in transactions if t.get('category') != 'internal_transfer']
    computed_income = sum(float(t.get('amount', 0)) for t in valid_txs if t.get('transaction_type') == 'Credit' or t.get('category') == 'income')
    computed_expense = sum(float(t.get('amount', 0)) for t in valid_txs if t.get('transaction_type') == 'Debit' and t.get('category') != 'income')

    reconciliation_error = False
    details = []

    if declared_income and declared_income > 0:
        income_diff = abs(computed_income - declared_income) / declared_income
        if income_diff > 0.02:
            reconciliation_error = True
            details.append(f"Income mismatch: computed ₹{computed_income:,.2f} vs declared ₹{declared_income:,.2f} ({income_diff*100:.1f}% variance)")

    if declared_expense and declared_expense > 0:
        expense_diff = abs(computed_expense - declared_expense) / declared_expense
        if expense_diff > 0.02:
            reconciliation_error = True
            details.append(f"Expense mismatch: computed ₹{computed_expense:,.2f} vs declared ₹{declared_expense:,.2f} ({expense_diff*100:.1f}% variance)")

    if reconciliation_error:
        return {
            "status": "extraction_integrity_failed",
            "reason": "totals_mismatch",
            "details": details,
            "declared": {"income": declared_income, "expense": declared_expense},
            "computed": {"income": computed_income, "expense": computed_expense},
            "message": "Extracted transaction totals do not match the declared totals on the statement header."
        }

    return {"status": "ok", "computed_income": computed_income, "computed_expense": computed_expense}

DOCUMENTATION_BLACK_KEYWORDS = [
    'table of contents', 'executive summary', 'system documentation', 'technical architecture',
    'feasibility study', 'implementation guide', 'problem statement', 'business model',
    'roadmap & conclusion', 'software requirement', 'project report', 'user manual'
]

STATEMENT_INDICATORS = [
    'bank statement', 'account statement', 'statement of account', 'upi statement',
    'payment history', 'transaction history', 'transaction statement', 'gpay statement',
    'paytm statement', 'phonepe statement', 'passbook', 'hdfc bank', 'icici bank',
    'state bank', 'sbi bank', 'axis bank', 'kotak bank', 'canara bank', 'pnb bank',
    'indusind bank', 'bank of baroda', 'central bank', 'union bank', 'money received',
    'money paid', 'payments received', 'payments made', 'upi ref no', 'txn id'
]

def parse_pdf_buffer(pdf_bytes: bytes, password: str = None) -> dict:
    full_text, tables = extract_tables_and_text(pdf_bytes, password=password)

    if not full_text or len(full_text.strip()) < 20:
        return {
            "status": "extraction_failed",
            "reason": "Unrecognized statement format or unreadable PDF.",
            "message": "This doesn't look like a supported statement format. Please upload your official UPI/bank PDF statement.",
            "transactions": []
        }

    text_lower = full_text.lower()

    # Blacklist Check: Hard reject documentation, presentation slides, or technical guides
    if any(k in text_lower for k in DOCUMENTATION_BLACK_KEYWORDS):
        return {
            "status": "extraction_failed",
            "reason": "Unrecognized statement format (Documentation/Report detected)",
            "message": "This appears to be a documentation or presentation file, not a bank/UPI statement. Please upload an official UPI/bank PDF statement.",
            "transactions": []
        }

    # Format Check: Ensure PDF contains bank/UPI statement layout keywords
    if not any(k in text_lower for k in STATEMENT_INDICATORS):
        return {
            "status": "extraction_failed",
            "reason": "Unrecognized statement format",
            "message": "This doesn't look like a supported statement format. Please upload your official UPI/bank PDF statement.",
            "transactions": []
        }

    transactions = parse_tables_and_text_to_transactions(full_text, tables)
    declared_count = detect_declared_row_count(full_text)
    extracted_count = len(transactions)

    # Task 6 Hard rejection if fewer than 3 valid transactions extracted
    if extracted_count < 3:
        return {
            "status": "extraction_failed",
            "reason": f"Only {extracted_count} transaction(s) extracted from PDF",
            "message": "We couldn't read valid transactions from this file. Please upload an official UPI/bank statement PDF (not a slide deck, screenshot, or random document).",
            "transactions": []
        }

    # Task 1 Post-extraction row count check
    if declared_count and extracted_count < declared_count:
        logger.warning(f"[pdf_parser] Incomplete extraction: Extracted {extracted_count} of {declared_count} declared transactions")
        return {
            "status": "extraction_failed",
            "reason": f"Extracted {extracted_count} of {declared_count} declared transactions — extraction incomplete.",
            "extracted_count": extracted_count,
            "declared_count": declared_count,
            "transactions": transactions,
            "raw_text_sample": full_text
        }

    dates = sorted([t['date'] for t in transactions if t.get('date')])
    start_date = dates[0] if dates else datetime.now().strftime('%Y-%m-%d')
    end_date = dates[-1] if dates else datetime.now().strftime('%Y-%m-%d')

    try:
        d1 = datetime.strptime(start_date, '%Y-%m-%d')
        d2 = datetime.strptime(end_date, '%Y-%m-%d')
        days_span = max(1, (d2 - d1).days + 1)
    except Exception:
        days_span = 30

    return {
        "status": "ok",
        "transactions": transactions,
        "statement_start_date": start_date,
        "statement_end_date": end_date,
        "statement_days": days_span,
        "total_count": len(transactions),
        "declared_count": declared_count,
        "raw_text_sample": full_text
    }

# ─── Task 2: Insufficient-Data Gate (Pre-Scoring Validation) ──────────────────

def check_minimum_thresholds(transactions: list, statement_days: int) -> dict:
    """
    Task 2 Gate: Validates statement volume, duration, total income, and unique sources before scoring.
    """
    MIN_TRANSACTIONS = 15
    MIN_STATEMENT_DAYS = 60
    MIN_TOTAL_INCOME = 5000.0        # ₹
    MIN_UNIQUE_INCOME_SOURCES = 2

    transaction_count = len(transactions)
    income_txs = [t for t in transactions if t.get('transaction_type') == 'Credit' or t.get('category') == 'income']
    total_income = sum(float(t.get('amount', 0)) for t in income_txs)

    unique_sources = set(t.get('description', '').lower().strip() for t in income_txs if t.get('description'))
    unique_income_sources = len(unique_sources)

    reasons = []
    if transaction_count < MIN_TRANSACTIONS:
        reasons.append(f"Transaction count ({transaction_count}) is below minimum required ({MIN_TRANSACTIONS}).")
    if statement_days < MIN_STATEMENT_DAYS:
        reasons.append(f"Statement span ({statement_days} days) is below minimum required ({MIN_STATEMENT_DAYS} days).")
    if total_income < MIN_TOTAL_INCOME:
        reasons.append(f"Total income (₹{total_income:,.2f}) is below minimum required (₹{MIN_TOTAL_INCOME:,.2f}).")
    if unique_income_sources < MIN_UNIQUE_INCOME_SOURCES:
        reasons.append(f"Unique income sources ({unique_income_sources}) is below minimum required ({MIN_UNIQUE_INCOME_SOURCES}).")

    if reasons:
        return {
            "status": "insufficient_data",
            "score": None,
            "reasons": reasons,
            "message": "We need a longer or more complete statement to generate a reliable score."
        }

    return {"status": "ok"}

# ─── Task 3: Detect One-Sided / Incomplete Statement Types ───────────────────

def check_statement_type(transactions: list, raw_text: str) -> dict:
    """
    Task 3 Gate: Detects payment-app receipts exports (money received only, 0 debits).
    Full bank statements with both credits & debits pass this check cleanly.
    """
    debit_txs = [t for t in transactions if t.get('transaction_type') == 'Debit']
    total_debits = sum(float(t.get('amount', 0)) for t in debit_txs)
    payment_made_count = len(debit_txs)

    flag = None
    if total_debits == 0 and payment_made_count == 0:
        flag = "receipts_only_no_debits"

    if flag:
        return {
            "status": "incomplete_statement_type",
            "score": None,
            "detected_issue": flag,
            "message": "This document only shows money received, with no spending or balance data. Upload your full bank/UPI statement (showing both credits and debits) for an accurate score."
        }

    return {"status": "ok"}
