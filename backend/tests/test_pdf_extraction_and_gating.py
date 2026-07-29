import sys
import os
import unittest
from unittest.mock import patch
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.pdf_parser import (
    extract_amount_from_cell,
    detect_declared_row_count,
    check_statement_type,
    check_minimum_thresholds
)

class TestExtractionAndGating(unittest.TestCase):

    def test_isolated_amount_parsing_rs_1119(self):
        """
        Task 1 Unit Test:
        Asserts 'Rs.1,119' parses as 1119.0, NOT 1.
        """
        raw_amount_str = "Rs.1,119"
        parsed_val = extract_amount_from_cell(raw_amount_str)
        self.assertEqual(parsed_val, 1119.0, f"Expected 1119.0, got {parsed_val}")

        self.assertEqual(extract_amount_from_cell("₹45,226.35"), 45226.35)
        self.assertEqual(extract_amount_from_cell("INR 5,000"), 5000.0)
        self.assertEqual(extract_amount_from_cell("Received Rs.1,119 from John"), 1119.0)

    def test_declared_row_count_detection(self):
        """
        Task 1 Unit Test:
        Detects declared transaction count from PDF header metadata.
        """
        header_text = "Paytm Payment History\nPeriod: 26 Apr'26 - 25 Jul'26\n10 Payments received\nTotal Amount: Rs.1,119"
        count = detect_declared_row_count(header_text)
        self.assertEqual(count, 10, f"Expected 10 declared payments, got {count}")

    def test_paytm_receipt_fixture_incomplete_statement_type(self):
        """
        Task 5 Regression Test using exact Paytm failing fixture:
        Period: 26 Apr'26–25 Jul'26, 10 payments received, ₹1,119 total, 0 payments made, no balance data.
        Expected result: status 'incomplete_statement_type' (receipts-only, no debits).
        MUST NOT produce a numeric score or score band.
        """
        paytm_fixture_transactions = [
            {"date": "2026-04-26", "description": "Received from User 1", "amount": 100.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-05-02", "description": "Received from User 2", "amount": 150.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-05-15", "description": "Received from User 3", "amount": 119.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-05-20", "description": "Received from User 4", "amount": 200.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-01", "description": "Received from User 5", "amount": 50.0,  "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-10", "description": "Received from User 6", "amount": 100.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-25", "description": "Received from User 7", "amount": 100.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-07-02", "description": "Received from User 8", "amount": 100.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-07-15", "description": "Received from User 9", "amount": 100.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-07-25", "description": "Received from User 10", "amount": 100.0, "transaction_type": "Credit", "category": "income"},
        ]
        raw_text = "Paytm Payment History\n10 Payments received\nRs.1,119 total\nNote: Excludes self-transfers and wallet payments."

        # Task 3 Gate Check
        stmt_res = check_statement_type(paytm_fixture_transactions, raw_text)
        self.assertEqual(stmt_res["status"], "incomplete_statement_type")
        self.assertIsNone(stmt_res["score"])
        self.assertEqual(stmt_res["detected_issue"], "receipts_only_no_debits")
        self.assertIn("money received", stmt_res["message"].lower())

    def test_insufficient_data_gate_thresholds(self):
        """
        Task 2 Unit Test:
        Asserts insufficient data gate triggers if transactions < 15 or span < 60 days or total income < ₹5,000.
        """
        sparse_transactions = [
            {"date": "2026-06-01", "description": "Client A", "amount": 1000.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-15", "description": "Client B", "amount": 1500.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-20", "description": "Rent",     "amount": 800.0,  "transaction_type": "Debit",  "category": "essential_spend"},
        ]

        threshold_res = check_minimum_thresholds(sparse_transactions, statement_days=20)
        self.assertEqual(threshold_res["status"], "insufficient_data")
        self.assertIsNone(threshold_res["score"])
        self.assertTrue(len(threshold_res["reasons"]) >= 1)
        self.assertIn("longer or more complete statement", threshold_res["message"])

    def test_self_transfer_exclusion(self):
        """
        Task 1 Unit Test:
        Asserts self-transfers are categorized as internal_transfer and excluded from total_income and total_expense.
        """
        from app.services.pdf_parser import categorise
        from app.services.scoring_engine import calculate_metrics

        self.assertEqual(categorise("Self transfer to Airtel Payments Bank", "Debit"), "internal_transfer")
        self.assertEqual(categorise("Self transfer from Indian Bank", "Credit"), "internal_transfer")

        txs = [
            {"date": "2026-06-01", "description": "Salary Credit", "amount": 59499.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-05", "description": "Self transfer to Jio Bank", "amount": 100000.0, "transaction_type": "Debit", "category": "internal_transfer"},
            {"date": "2026-06-06", "description": "Self transfer from Jio Bank", "amount": 100000.0, "transaction_type": "Credit", "category": "internal_transfer"},
            {"date": "2026-06-15", "description": "Vendor Payment", "amount": 55726.38, "transaction_type": "Debit", "category": "discretionary_spend"},
        ]

        metrics = calculate_metrics(txs)
        self.assertEqual(metrics["total_income"], 59499)
        self.assertEqual(metrics["total_expense"], 55726)

    def test_header_totals_reconciliation(self):
        """
        Task 2 Unit Test:
        Asserts reconcile_header_totals flags extraction_integrity_failed if computed totals mismatch declared header by >2%.
        """
        from app.services.pdf_parser import reconcile_header_totals

        raw_header = "Google Pay History\nMoney Sent: ₹55,726.38\nMoney Received: ₹59,499.00"
        mismatched_txs = [
            {"date": "2026-06-01", "description": "Income", "amount": 237165.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-05", "description": "Expense", "amount": 456130.0, "transaction_type": "Debit", "category": "discretionary_spend"},
        ]

        res = reconcile_header_totals(mismatched_txs, raw_header)
        self.assertEqual(res["status"], "extraction_integrity_failed")
        self.assertEqual(res["reason"], "totals_mismatch")

    def test_missing_balance_trend_nullification(self):
        """
        Task 5 Unit Test:
        Asserts balance_trend_score is None (null) when no running_balance exists in source PDF.
        """
        from app.services.scoring_engine import calculate_metrics
        txs_no_balance = [
            {"date": "2026-06-01", "description": "Income", "amount": 10000.0, "transaction_type": "Credit", "category": "income"},
            {"date": "2026-06-05", "description": "Spend", "amount": 5000.0, "transaction_type": "Debit", "category": "essential_spend"},
        ]

        metrics = calculate_metrics(txs_no_balance)
        self.assertIsNone(metrics["balance_trend_score"])
        self.assertEqual(metrics["trend_direction"], "unavailable")

    def test_zero_transactions_hard_reject(self):
        """
        Task 6 Unit Test:
        Asserts parse_pdf_buffer hard-rejects 0 transactions or unreadable PDF text with status 'extraction_failed'.
        """
        from app.services.pdf_parser import parse_pdf_buffer
        res = parse_pdf_buffer(b"short unreadable text buffer")
        self.assertEqual(res["status"], "extraction_failed")
        self.assertIn("doesn't look like a supported statement", res["message"])

    def test_non_statement_pdf_hard_reject(self):
        """
        Task 6 Unit Test:
        Asserts a non-statement presentation PDF (e.g. Smart Coffee Machine deck) is hard-rejected with status 'extraction_failed'.
        """
        from app.services.pdf_parser import parse_pdf_buffer
        coffee_deck_text = b"Smart Coffee Machine IoT of Caffeine Problem Statement Statistics Stakeholders Present Scenario Notifications Predictive Maintenance 27% of Manufacturers Plan to Achieve Digital Transformation"
        res = parse_pdf_buffer(coffee_deck_text)
        self.assertEqual(res["status"], "extraction_failed")
        self.assertTrue("Unrecognized statement format" in res["reason"])
        self.assertIn("doesn't look like a supported statement format", res["message"])

    def test_deterministic_loan_tier_lookup(self):
        """
        Asserts calculate_loan_tier computes deterministic loan amount and tier fields.
        """
        from app.services.scoring_engine import calculate_loan_tier

        # Excellent tier (85+) -> 15x monthly savings
        res_85 = calculate_loan_tier(88, 10000.0)
        self.assertEqual(res_85["lender_eligibility"], "yes")
        self.assertEqual(res_85["loan_amount_recommended"], 150000)
        self.assertEqual(res_85["interest_rate_range"], "12-18%")
        self.assertEqual(res_85["risk_assessment"], "low")

        # Good tier (55-69) -> 4x monthly savings
        res_60 = calculate_loan_tier(60, 5000.0)
        self.assertEqual(res_60["lender_eligibility"], "yes")
        self.assertEqual(res_60["loan_amount_recommended"], 20000)
        self.assertEqual(res_60["interest_rate_range"], "24-30%")

        # Fair tier (40-54) -> 2x monthly savings, conditional
        res_45 = calculate_loan_tier(45, 5000.0)
        self.assertEqual(res_45["lender_eligibility"], "conditional")
        self.assertEqual(res_45["loan_amount_recommended"], 10000)

        # Poor tier (<40) -> ineligible
        res_35 = calculate_loan_tier(35, 5000.0)
        self.assertEqual(res_35["lender_eligibility"], "no")
        self.assertEqual(res_35["loan_amount_recommended"], 0)

    def test_check_hard_rejection_rules(self):
        """
        Asserts check_hard_rejection overrides loan eligibility to 'no' when high risk conditions trigger.
        """
        from app.services.scoring_engine import calculate_loan_tier, check_hard_rejection

        metrics_high_discretionary = {
            "ir_score": 70, "sr_score": 60, "bounce_count": 0,
            "discretionary_percent": 85.0, "total_income": 20000.0
        }
        rej_disc = check_hard_rejection(metrics_high_discretionary)
        self.assertIn("Discretionary spend exceeds 80%", rej_disc)

        res = calculate_loan_tier(75, 5000.0, metrics_high_discretionary)
        self.assertEqual(res["lender_eligibility"], "no")
        self.assertEqual(res["loan_amount_recommended"], 0)
        self.assertEqual(res["rejection_reason"], rej_disc)

    @patch('app.services.pdf_parser.extract_tables_and_text')
    def test_documentation_pdf_hard_reject(self, mock_extract):
        """
        Asserts system documentation/architecture PDFs (e.g. BankMind System Documentation) are hard-rejected.
        """
        mock_extract.return_value = ("BankMind Complete System Documentation 2026 Page 1 Executive Summary Table of Contents Feasibility Study Technical Architecture & Stack Implementation Guide", [])
        from app.services.pdf_parser import parse_pdf_buffer
        res = parse_pdf_buffer(b"dummy pdf bytes")
        self.assertEqual(res["status"], "extraction_failed")
        self.assertIn("Documentation/Report detected", res["reason"])
        self.assertIn("appears to be a documentation or presentation file", res["message"])

if __name__ == '__main__':
    unittest.main()
