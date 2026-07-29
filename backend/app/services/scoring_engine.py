import math
import statistics
from datetime import datetime, date

def clamp(val, min_val=0, max_val=100):
    return max(min_val, min(max_val, val))

def check_hard_rejection(m: dict) -> str | None:
    """
    Pre-check rejection rules (run before loan tier lookup, overrides tier if triggered).
    """
    if not m:
        return None
    if m.get("ir_score", 100) < 20 and m.get("sr_score", 100) < 10:
        return "Income too irregular and savings too low"
    if m.get("bounce_count", 0) > 4:
        return "Excessive bounce frequency (>4 incidents)"
    if m.get("discretionary_percent", 0) > 80:
        return "Discretionary spend exceeds 80% of income"
    if m.get("total_income", 0) < 5000:
        return "Total income below minimum threshold (₹5,000)"
    return None

def calculate_loan_tier(score_value: int, monthly_savings: float, metrics: dict = None) -> dict:
    """
    Deterministic loan-tier lookup based on ScoreZero score and monthly savings.
    Zero AI involved — 100% mathematical rules.
    """
    rejection = check_hard_rejection(metrics) if metrics else None
    if rejection:
        return {
            "lender_eligibility": "no",
            "loan_amount_recommended": 0,
            "interest_rate_range": "36%+",
            "risk_assessment": "high",
            "rejection_reason": rejection
        }

    savings = max(0, monthly_savings)
    if score_value >= 85:
        return {
            "lender_eligibility": "yes",
            "loan_amount_recommended": int(round(savings * 15)),
            "interest_rate_range": "12-18%",
            "risk_assessment": "low",
            "rejection_reason": None
        }
    elif score_value >= 70:
        return {
            "lender_eligibility": "yes",
            "loan_amount_recommended": int(round(savings * 8)),
            "interest_rate_range": "18-24%",
            "risk_assessment": "medium-low",
            "rejection_reason": None
        }
    elif score_value >= 55:
        return {
            "lender_eligibility": "yes",
            "loan_amount_recommended": int(round(savings * 4)),
            "interest_rate_range": "24-30%",
            "risk_assessment": "medium",
            "rejection_reason": None
        }
    elif score_value >= 40:
        return {
            "lender_eligibility": "conditional",
            "loan_amount_recommended": int(round(savings * 2)),
            "interest_rate_range": "30-36%",
            "risk_assessment": "medium-high",
            "rejection_reason": None
        }
    else:
        return {
            "lender_eligibility": "no",
            "loan_amount_recommended": 0,
            "interest_rate_range": "36%+",
            "risk_assessment": "high",
            "rejection_reason": "Score below 40 threshold"
        }

def calculate_metrics(transactions: list) -> dict:
    """
    LAYER 1: Deterministic Metric Calculation
    Computes exact scores and summary statistics from transactions.
    Zero AI involved — 100% mathematical rules.
    """
    if not transactions:
        transactions = []

    income_credits = []
    monthly_income = {}
    total_essential = 0.0
    total_discretionary = 0.0
    total_loan = 0.0
    bounce_count = 0
    last_bounce_date = "None"
    balances = []
    dates = []

    has_running_balance = False

    for t in transactions:
        amt = abs(float(t.get('amount', 0)))
        cat = t.get('category', '')
        t_type = (t.get('transaction_type') or t.get('type') or '').lower()
        desc = (t.get('description') or t.get('narration') or '').lower()
        t_date = t.get('date')

        if t_date:
            dates.append(t_date)

        # Check for bounce / penalty
        is_bounce = (
            cat == 'bounce_penalty' or
            any(k in desc for k in ['return', 'insuff fund', 'ecs bounce', 'chrg-bounce', 'penalty']) or
            (t.get('running_balance') is not None and float(t['running_balance']) < 0)
        )
        if is_bounce:
            bounce_count += 1
            if t_date:
                last_bounce_date = t_date

        if t.get('running_balance') is not None:
            has_running_balance = True
            try:
                balances.append(float(t['running_balance']))
            except (ValueError, TypeError):
                pass

        # TASK 1 FIX: Exclude internal_transfer from all income & expense metrics
        if cat == 'internal_transfer':
            continue

        if cat == 'income' or t_type == 'credit':
            income_credits.append(amt)
            if t_date:
                month_key = t_date[:7] # YYYY-MM
                monthly_income[month_key] = monthly_income.get(month_key, 0.0) + amt
        elif cat == 'essential_spend':
            total_essential += amt
        elif cat == 'discretionary_spend':
            total_discretionary += amt
        elif cat == 'loan_repayment':
            total_loan += amt
        else:
            total_discretionary += amt

    total_income = sum(income_credits)
    total_expense = total_essential + total_discretionary + total_loan
    monthly_savings = total_income - total_expense

    # Dates & Days
    dates_sorted = sorted(dates) if dates else []
    start_date = dates_sorted[0] if dates_sorted else datetime.now().strftime('%Y-%m-%d')
    end_date = dates_sorted[-1] if dates_sorted else datetime.now().strftime('%Y-%m-%d')
    
    try:
        d1 = datetime.strptime(start_date, '%Y-%m-%d')
        d2 = datetime.strptime(end_date, '%Y-%m-%d')
        days_span = max(1, (d2 - d1).days + 1)
    except Exception:
        days_span = 30

    # 1. Income Regularity (IR)
    m_totals = list(monthly_income.values()) if monthly_income else [total_income]
    mean_inc = statistics.mean(m_totals) if m_totals else total_income
    stdev_inc = statistics.stdev(m_totals) if len(m_totals) > 1 else 0.0
    cv = (stdev_inc / mean_inc) if mean_inc > 0 else (0.5 if total_income == 0 else 0.0)
    ir_score = int(round(clamp(100 - (cv * 150), 0, 100)))
    ir_variance = int(round(cv * 100))
    avg_deposit = int(round(mean_inc / max(len(income_credits), 1))) if income_credits else int(round(mean_inc))

    # 2. Savings Ratio (SR)
    savings_ratio = ((total_income - total_expense) / total_income * 100.0) if total_income > 0 else 0.0
    if total_expense == 0 and total_income > 0:
        sr_score = 20
    elif savings_ratio <= 0:
        sr_score = 0
    elif savings_ratio >= 50:
        sr_score = 100
    else:
        sr_score = int(round((savings_ratio / 50.0) * 100))

    # 3. Spending Discipline (SD)
    if total_expense == 0 and total_income > 0:
        essential_percent = 0
        discretionary_percent = 0
        sd_score = 20
    else:
        essential_percent = int(round((total_essential / total_expense * 100.0))) if total_expense > 0 else 100
        discretionary_percent = int(round((total_discretionary / total_expense * 100.0))) if total_expense > 0 else 0
        sd_score = int(round(clamp(essential_percent, 0, 100)))

    # 4. Bounce Frequency (BF)
    bf_score = int(round(clamp(100 - (bounce_count * 15), 0, 100)))

    # 5. Balance Trend (BT) — TASK 5 FIX: Set to None if no balance field in PDF
    if not has_running_balance:
        bt_score = None
        trend_direction = "unavailable"
        start_balance = 0
        end_balance = 0
        balance_change_pct = 0.0
        # Reweight remaining 4 metrics proportionally (sum of weights = 0.85)
        final_score = int(round(
            (0.25 / 0.85) * ir_score +
            (0.20 / 0.85) * sr_score +
            (0.20 / 0.85) * sd_score +
            (0.20 / 0.85) * bf_score
        ))
    else:
        start_balance = balances[0] if balances else max(0, total_income - total_expense)
        end_balance = balances[-1] if balances else max(0, total_income)
        balance_change_pct = (((end_balance - start_balance) / start_balance * 100.0) if start_balance > 0 else 0.0)
        bt_score = int(round(clamp(50 + (balance_change_pct * 1.5), 0, 100)))
        trend_direction = "improving" if bt_score >= 55 else ("declining" if bt_score <= 45 else "flat")

        final_score = int(round(
            0.25 * ir_score +
            0.20 * sr_score +
            0.20 * sd_score +
            0.20 * bf_score +
            0.15 * bt_score
        ))

    # Score Band
    if final_score >= 85:
        score_band = 'Excellent'
    elif final_score >= 70:
        score_band = 'Very Good'
    elif final_score >= 55:
        score_band = 'Good'
    elif final_score >= 40:
        score_band = 'Fair'
    else:
        score_band = 'Poor'

    metrics_dict = {
        "ir_score": ir_score,
        "sr_score": sr_score,
        "bounce_count": bounce_count,
        "discretionary_percent": discretionary_percent,
        "total_income": total_income
    }
    loan_tier = calculate_loan_tier(final_score, monthly_savings, metrics_dict)

    return {
        "score_value": final_score,
        "score_band": score_band,
        "start_date": start_date,
        "end_date": end_date,
        "days": days_span,
        "total_income": int(round(total_income)),
        "total_expense": int(round(total_expense)),
        "monthly_savings": int(round(monthly_savings)),
        "savings_ratio": round(savings_ratio, 1),
        "essential_percent": essential_percent,
        "discretionary_percent": discretionary_percent,
        "monthly_spend": int(round(total_expense)),
        "start_balance": int(round(start_balance)),
        "end_balance": int(round(end_balance)),
        "balance_change_pct": round(balance_change_pct, 2),
        "trend_direction": trend_direction,
        "bounce_count": bounce_count,
        "last_bounce_date": last_bounce_date,
        "ir_score": ir_score,
        "ir_variance": ir_variance,
        "avg_deposit": avg_deposit,
        "sr_score": sr_score,
        "sd_score": sd_score,
        "bf_score": bf_score,
        "bt_score": bt_score,
        # Standard keys for backwards compatibility
        "income_regularity_score": ir_score,
        "savings_ratio_score": sr_score,
        "spending_discipline_score": sd_score,
        "bounce_frequency_score": bf_score,
        "balance_trend_score": bt_score,
        "loan_tier": loan_tier,
        "loan_assessment": loan_tier
    }
