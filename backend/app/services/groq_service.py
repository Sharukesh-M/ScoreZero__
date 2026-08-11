import json
import logging
import requests
from groq import Groq
from app.config import Config

logger = logging.getLogger(__name__)

def generate_fallback_recommendations(m: dict, score_value: int, score_band: str) -> dict:
    """
    Safety net non-AI recommendation generator following the exact Layer 2 rules.
    Used if Groq/GLM API calls time out (>4s) or return invalid JSON.
    """
    # Derive priority and timeframe from score_value
    if score_value < 40:
        priority, timeframe = "high", "1 week"
    elif score_value <= 54:
        priority, timeframe = "high", "2 weeks"
    elif score_value <= 69:
        priority, timeframe = "medium", "1 month"
    elif score_value <= 84:
        priority, timeframe = "medium", "3 months"
    else:
        priority, timeframe = "low", "maintenance"

    # Identify highest and lowest metrics
    metric_pairs = [
        ("Income Regularity", m.get("ir_score", 0)),
        ("Savings Ratio", m.get("sr_score", 0)),
        ("Spending Discipline", m.get("sd_score", 0)),
        ("Bounce Frequency", m.get("bf_score", 0)),
        ("Balance Trend", m.get("bt_score", 0)),
    ]
    sorted_metrics = sorted(metric_pairs, key=lambda x: x[1])

    lowest = sorted_metrics[0]
    highest = sorted_metrics[-1]

    insights = [
        f"Strength: {highest[0]} is your strongest area with a score of {highest[1]}/100.",
        f"Gap: {lowest[0]} is currently your key growth area with a score of {lowest[1]}/100."
    ]

    recs = []
    # Metric specific rules
    if m.get("ir_score", 100) < 60:
        recs.append(f"1. Diversify income sources -> reduce income variance from current {m.get('ir_variance', 0)}% across average deposits of ₹{m.get('avg_deposit', 0)}.")
    if m.get("sr_score", 100) < 60:
        disc_amt = int(m.get("monthly_spend", 0) * (m.get("discretionary_percent", 0) / 100.0))
        recs.append(f"2. Reduce discretionary monthly spend by ₹{int(disc_amt * 0.2)} -> increase savings ratio above {m.get('savings_ratio', 0)}%.")
    if m.get("sd_score", 100) < 60:
        daily_cap = int(m.get("monthly_spend", 0) * (m.get("discretionary_percent", 0) / 100.0) / 30)
        recs.append(f"3. Implement expense tracking -> cap discretionary spending at ₹{daily_cap}/day out of monthly spend ₹{m.get('monthly_spend', 0)}.")
    if m.get("bf_score", 100) < 80:
        recs.append(f"4. Maintain a ₹5,000 minimum bank balance buffer -> eliminate {m.get('bounce_count', 0)} bounce penalty incidents (last: {m.get('last_bounce_date', 'N/A')}).")
    if m.get("bt_score", 100) < 50:
        recs.append(f"5. Target a ₹{int(m.get('total_expense', 0) * 0.15)} expense cut -> reverse declining trend from ₹{m.get('start_balance', 0)} to ₹{m.get('end_balance', 0)} within 60 days.")

    # Fill default structured recommendations if metrics are strong
    if not recs:
        recs = [
            f"1. Maintain current budget -> preserve healthy savings ratio of {m.get('savings_ratio', 0)}%.",
            f"2. Auto-transfer ₹{int(m.get('monthly_savings', 0) * 0.5)} monthly -> grow balance from current ₹{m.get('end_balance', 0)}.",
            f"3. Continue zero-bounce discipline -> retain optimal bounce score of {m.get('bf_score', 100)}/100."
        ]

    explanation = (
        f"Your ScoreZero score of {score_value}/100 ({score_band}) reflects a total income of ₹{m.get('total_income', 0)} "
        f"against ₹{m.get('total_expense', 0)} in total expenses over {m.get('days', 30)} days. "
        f"Focus on improving {lowest[0]} ({lowest[1]}/100) to raise your credit health band."
    )

    return {
        "explanation": explanation,
        "explanation_text": explanation,
        "insights": insights,
        "recommendations": recs[:3],
        "items": recs[:3],
        "priority": priority,
        "timeframe": timeframe,
        "ai_generated": False
    }

def generate_fallback_recommendations(m: dict, score_value: int, score_band: str) -> dict:
    """
    Safety net non-AI recommendation generator following exact Layer 2 rules.
    Used if Groq/GLM API calls time out (>4s) or return invalid JSON.
    """
    if score_value < 40:
        priority, timeframe = "high", "1 week"
    elif score_value <= 54:
        priority, timeframe = "high", "2 weeks"
    elif score_value <= 69:
        priority, timeframe = "medium", "1 month"
    elif score_value <= 84:
        priority, timeframe = "medium", "3 months"
    else:
        priority, timeframe = "low", "maintenance"

    metric_pairs = [
        ("Income Regularity", m.get("ir_score", 0)),
        ("Savings Ratio", m.get("sr_score", 0)),
        ("Spending Discipline", m.get("sd_score", 0)),
        ("Bounce Frequency", m.get("bf_score", 0)),
        ("Balance Trend", m.get("bt_score", 0) if m.get("bt_score") is not None else 50),
    ]
    sorted_metrics = sorted(metric_pairs, key=lambda x: x[1])

    lowest = sorted_metrics[0]
    highest = sorted_metrics[-1]

    insights = [
        f"Strength: {highest[0]} is your strongest area with a score of {highest[1]}/100.",
        f"Gap: {lowest[0]} is currently your key growth area with a score of {lowest[1]}/100."
    ]

    recs = []
    if m.get("ir_score", 100) < 60:
        recs.append(f"1. Maintain income steady -> reduce income variance from current {m.get('ir_variance', 0)}%.")
    if m.get("sr_score", 100) < 60:
        disc_amt = int(m.get("monthly_spend", 0) * (m.get("discretionary_percent", 0) / 100.0))
        recs.append(f"2. Cut discretionary spending -> trim ₹{int(disc_amt * 0.2)} monthly to boost savings ratio.")
    if m.get("sd_score", 100) < 60:
        daily_cap = int(m.get("monthly_spend", 0) * (m.get("discretionary_percent", 0) / 100.0) / 30)
        recs.append(f"3. Pay bills on time & cap daily spend -> target ₹{daily_cap}/day discretionary limit.")
    if m.get("bf_score", 100) < 80:
        recs.append(f"4. Maintain zero-bounce buffer -> eliminate {m.get('bounce_count', 0)} penalty incidents.")
    if m.get("bt_score") is not None and m.get("bt_score", 100) < 50:
        recs.append(f"5. Build 3-month positive balance history -> reverse declining trend within 60 days.")

    if not recs:
        recs = [
            f"1. Maintain steady income -> preserve healthy income score of {m.get('ir_score', 100)}/100.",
            f"2. Build 3-month statement history -> sustain consistent monthly savings of ₹{m.get('monthly_savings', 0)}.",
            f"3. Pay bills on time -> retain optimal zero-bounce discipline."
        ]

    explanation = (
        f"Your ScoreZero score of {score_value}/100 ({score_band}) reflects total income of ₹{m.get('total_income', 0)} "
        f"against ₹{m.get('total_expense', 0)} in expenses. Maintain steady income and pay bills on time to boost your rating."
    )

    loan_tier = m.get("loan_tier") or m.get("loan_assessment") or {}

    return {
        "explanation": explanation,
        "explanation_text": explanation,
        "insights": insights,
        "recommendations": recs[:3],
        "items": recs[:3],
        "priority": priority,
        "timeframe": timeframe,
        "ai_generated": False
    }

def generate_recommendations(m: dict, score_value: int, score_band: str, user_question: str = None) -> dict:
    """
    Generate structured, metric-derived AI explanations and action recommendations using Groq/GLM.
    Uses pre-computed loan tier outcomes and concise action-oriented recommendation rules.
    """
    loan_tier = m.get("loan_tier") or m.get("loan_assessment") or {}
    lender_eligibility = loan_tier.get("lender_eligibility", "no")
    loan_amount = loan_tier.get("loan_amount_recommended", 0)
    rate_range = loan_tier.get("interest_rate_range", "36%+")
    risk_assessment = loan_tier.get("risk_assessment", "high")

    bt_display = f"{m.get('bt_score')}/100" if m.get('bt_score') is not None else "Unavailable (excluded from score)"

    user_q_section = ""
    if user_question and user_question.strip():
        user_q_section = f"""
## User Specific Question (OPTIONAL)
User asked: "{user_question.strip()}"
Please directly answer this user question in 1-2 helpful sentences in the JSON key "custom_question_answer".
"""

    prompt = f"""SYSTEM/TASK: You are a financial explainer for ScoreZero. You NEVER invent numbers,
NEVER decide loan eligibility, amount, or interest rate — those are computed deterministically by the
backend and given to you as fixed values below. Your only job is to explain them in plain, punchy English.
Output ONLY a single valid JSON object — no markdown, no preamble.

## User's Financial Profile
- Score: {score_value}/100 ({score_band})
- Statement Period: {m.get('start_date', 'N/A')} to {m.get('end_date', 'N/A')} ({m.get('days', 30)} days)
- Total Income: ₹{m.get('total_income', 0)}
- Total Expense: ₹{m.get('total_expense', 0)}
- Monthly Savings: ₹{m.get('monthly_savings', 0)} ({m.get('savings_ratio', 0)}% ratio)

## Metrics (use exactly these)
1. Income Regularity: {m.get('ir_score', 0)}/100 (variance {m.get('ir_variance', 0)}%, avg deposit ₹{m.get('avg_deposit', 0)})
2. Savings Ratio: {m.get('sr_score', 0)}/100 (ratio {m.get('savings_ratio', 0)}%, monthly savings ₹{m.get('monthly_savings', 0)})
3. Spending Discipline: {m.get('sd_score', 0)}/100 (essential {m.get('essential_percent', 0)}%, discretionary {m.get('discretionary_percent', 0)}%)
4. Bounce Frequency: {m.get('bf_score', 0)}/100 ({m.get('bounce_count', 0)} incidents)
5. Balance Trend: {bt_display}

## Pre-computed lending outcome (STATE, DO NOT RE-DERIVE)
- Eligibility: {lender_eligibility}
- Recommended amount: ₹{loan_amount}
- Interest rate range: {rate_range}
- Risk tier: {risk_assessment}
{user_q_section}

## Output — JSON ONLY:
{{
  "explanation": "2-3 sentences, plain English, cite real metrics from above",
  "insights": ["strength - name highest metric and why", "gap - name lowest metric and implication"],
  "recommendations": [
    "1. [Short action phrase, e.g. Maintain income steady] -> [expected outcome with numbers]",
    "2. [Short action phrase, e.g. Build 3-month history] -> [expected outcome with numbers]",
    "3. [Short action phrase, e.g. Pay bills on time] -> [expected outcome with numbers]"
  ],
  "custom_question_answer": "Direct answer to user question if provided above, or null",
  "priority": "high|medium|low",
  "timeframe": "1 week|2 weeks|1 month|3 months|maintenance"
}}

Remember: JSON only. Never invent, estimate, or state a different loan amount or rate than given above."""

    errors = []

    # ── 1. Groq AI API ──────────────────────────────────────────────────────────
    if Config.GROQ_API_KEY:
        models_to_try = [Config.GROQ_MODEL, "llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama3-8b-8192"]
        # Remove duplicates while preserving order
        models_to_try = list(dict.fromkeys([m for m in models_to_try if m and m != 'mixtral-8x7b-32768']))
        client = Groq(api_key=Config.GROQ_API_KEY)
        for model_name in models_to_try:
            try:
                logger.info(f"[groq_service] Calling Groq model '{model_name}'...")
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=600,
                    temperature=0.2,
                    timeout=float(Config.GROQ_TIMEOUT_MS) / 1000.0
                )
                content = response.choices[0].message.content.strip()
                cleaned = content.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)

                explanation = parsed.get("explanation", "").strip()
                recs = parsed.get("recommendations", [])
                insights = parsed.get("insights", [])

                if explanation and isinstance(recs, list) and len(recs) >= 3:
                    logger.info(f"[groq_service] Groq model '{model_name}' succeeded!")
                    return {
                        "explanation": explanation,
                        "explanation_text": explanation,
                        "insights": insights,
                        "recommendations": recs[:3],
                        "items": recs[:3],
                        "user_question": user_question,
                        "custom_question_answer": parsed.get("custom_question_answer"),
                        "priority": parsed.get("priority", "medium"),
                        "timeframe": parsed.get("timeframe", "1 month"),
                        "ai_generated": True
                    }
            except Exception as e:
                logger.warning(f"[groq_service] Groq model '{model_name}' failed/timed out ({e})")
                errors.append(str(e))

    # ── 2. Zhipu AI / GLM API Fallback ─────────────────────────────────────────
    if Config.GLM_OCR_API_KEY:
        try:
            logger.info(f"[groq_service] Calling Zhipu AI GLM model '{Config.GLM_TEXT_MODEL}'...")
            headers = {
                "Authorization": f"Bearer {Config.GLM_OCR_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": Config.GLM_TEXT_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2
            }
            resp = requests.post("https://open.bigmodel.cn/api/paas/v4/chat/completions", json=payload, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                cleaned = content.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                explanation = parsed.get("explanation", "").strip()
                recs = parsed.get("recommendations", [])
                insights = parsed.get("insights", [])
                if explanation and isinstance(recs, list) and len(recs) >= 3:
                    logger.info("[groq_service] Zhipu AI GLM model succeeded!")
                    return {
                        "explanation": explanation,
                        "explanation_text": explanation,
                        "insights": insights,
                        "recommendations": recs[:3],
                        "items": recs[:3],
                        "user_question": user_question,
                        "custom_question_answer": parsed.get("custom_question_answer"),
                        "priority": parsed.get("priority", "medium"),
                        "timeframe": parsed.get("timeframe", "1 month"),
                        "ai_generated": True
                    }
        except Exception as e:
            logger.warning(f"[groq_service] Zhipu AI GLM failed ({e})")

    # ── 3. Rule-based Safety Net Fallback (if AI calls fail/timeout >4s) ───────
    logger.info("[groq_service] Using non-AI safety net fallback rules.")
    res_fb = generate_fallback_recommendations(m, score_value, score_band)
    res_fb["user_question"] = user_question
    if user_question and user_question.strip():
        uq_lower = user_question.lower()
        if "loan" in uq_lower or "when" in uq_lower or "eligible" in uq_lower:
            if score_value >= 70:
                res_fb["custom_question_answer"] = f"Based on your strong score of {score_value}/100 ({score_band}), you are currently eligible for pre-approved loan offers! Keep your deposit history clean."
            elif score_value >= 50:
                res_fb["custom_question_answer"] = f"With a moderate score of {score_value}/100, maintain 30–60 days of consistent salary deposits and 0 bounce fees to reach high-confidence loan approval."
            else:
                res_fb["custom_question_answer"] = f"With a score of {score_value}/100 ({score_band}), loan approval requires building a 3-month clean transaction history with zero bounce fees and reducing monthly expenses."
        else:
            res_fb["custom_question_answer"] = f"Regarding '{user_question.strip()}': Your financial profile shows total income ₹{m.get('total_income', 0)} against ₹{m.get('total_expense', 0)} expenses. Focus on maintaining positive monthly savings."
    return res_fb


def generate_intelligent_statement_chat_response(
    question: str,
    score_data: dict = None,
    history_scores: list = None,
    transactions: list = None
) -> str:
    """
    Generates a personalized, highly accurate financial advisory answer for user statement Q&A.
    Incorporates:
    - User's calculated ScoreZero rating (0-100) & score band
    - Sub-metrics: Income Regularity, Savings Ratio, Spending Discipline, Bounce Frequency, Balance Trend
    - Historical score trajectory & evolution across all statement evaluations
    - Extracted transactions summary & totals
    - Multi-tier LLM execution (Groq -> ZhipuAI/GLM) with rich rule-based fallback
    """
    if not question:
        return "Please ask a specific question about your statement, credit score, or loan eligibility."

    score_data = score_data or {}
    history_scores = history_scores or []
    transactions = transactions or []

    # Extract score details
    score_val = score_data.get('score_value')
    if score_val is None:
        metrics_dict = score_data.get('metrics', {})
        score_val = metrics_dict.get('score_value', 50) if isinstance(metrics_dict, dict) else 50
    try:
        score_val = int(score_val)
    except Exception:
        score_val = 50

    score_band = score_data.get('score_band', 'Fair')
    metrics = score_data.get('metrics') or {}

    ir = int(metrics.get('income_regularity', score_val))
    sr = int(metrics.get('savings_ratio', score_val))
    sd = int(metrics.get('spending_discipline', score_val))
    bf = int(metrics.get('bounce_frequency', 100))
    bt = metrics.get('balance_trend')
    bt_val = int(bt) if bt is not None else 50

    recs = score_data.get('recommendations') or []

    # Transaction summary totals
    total_income = sum(float(t.get('amount', 0)) for t in transactions if t.get('category') == 'income' or t.get('transaction_type') == 'Credit')
    total_expense = sum(float(t.get('amount', 0)) for t in transactions if t.get('category') in ['essential_spend', 'discretionary_spend', 'bounce_penalty'] or t.get('transaction_type') == 'Debit')
    net_savings = total_income - total_expense

    income_count = len([t for t in transactions if t.get('category') == 'income' or t.get('transaction_type') == 'Credit'])

    # Historical trend
    hist_count = len(history_scores)
    avg_hist_score = round(sum(s.get('score_value', score_val) for s in history_scores) / max(1, hist_count)) if history_scores else score_val

    score_delta = None
    if len(history_scores) >= 2:
        curr_s = history_scores[0].get('score_value', score_val)
        prev_s = history_scores[1].get('score_value', score_val)
        score_delta = curr_s - prev_s

    trend_note = ""
    if score_delta is not None:
        if score_delta > 0:
            trend_note = f"(+ {score_delta} pts improvement vs previous statement)"
        elif score_delta < 0:
            trend_note = f"({score_delta} pts vs previous statement)"
        else:
            trend_note = "(unchanged vs previous statement)"

    # Identify lowest & highest metric
    metric_list = [
        ('Income Regularity', ir),
        ('Savings Ratio', sr),
        ('Spending Discipline', sd),
        ('Bounce Frequency', bf),
        ('Balance Trend', bt_val)
    ]
    sorted_m = sorted(metric_list, key=lambda x: x[1])
    lowest_metric = sorted_m[0]
    highest_metric = sorted_m[-1]

    # Build system prompt for LLM models (Groq / GLM)
    prompt = f"""You are ScoreZero AI Financial Advisor. Answer the user's question accurately, concisely, and supportively based on their calculated ScoreZero credit rating and statement history.

User Question: "{question}"

User Credit Profile Context:
- Current Score: {score_val}/100 ({score_band}) {trend_note}
- Calculated Sub-Metrics (0-100):
  * Income Regularity: {ir}/100
  * Savings Ratio: {sr}/100
  * Spending Discipline: {sd}/100
  * Bounce Frequency: {bf}/100
  * Balance Trend: {bt_val}/100
- History Context: Evaluated across {hist_count} statement(s). Historical Average Score: {avg_hist_score}/100.
- Statement Financial Totals: Total Inflow: ₹{total_income:,.2f}, Total Outflow: ₹{total_expense:,.2f}, Net Buffer: ₹{net_savings:,.2f}
- Key Action Plan Targets: {", ".join(recs[:3]) if recs else "Maintain steady income & zero bounce fees."}

Guidelines:
1. Provide a direct, specific answer to the user's question.
2. If asking about loan eligibility/approval ("when can I get loan?"):
   - Explain the 70/100 approval benchmark.
   - Mention their current score ({score_val}/100) and exact points gap (+{max(0, 70 - score_val)} points).
   - Give an estimated timeline (e.g. 30-60 days if score 50-69, 60-90 days if <50, instant if >=70) and 3 specific steps to qualify.
3. If asking "what should I do?" or how to improve:
   - Give 3 numbered bullet points focusing first on their lowest metric ({lowest_metric[0]}: {lowest_metric[1]}/100).
4. Use bullet points and bold formatting for readability.
"""

    answer = None

    # Tier 1: Try Groq API
    if Config.GROQ_API_KEY:
        models_to_try = [Config.GROQ_MODEL, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"]
        models_to_try = list(dict.fromkeys([m for m in models_to_try if m and m != 'mixtral-8x7b-32768']))
        try:
            client = Groq(api_key=Config.GROQ_API_KEY)
            for model_name in models_to_try:
                try:
                    resp = client.chat.completions.create(
                        model=model_name,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=450,
                        temperature=0.3,
                        timeout=3.5
                    )
                    answer = resp.choices[0].message.content.strip()
                    if answer:
                        logger.info(f"[statement_chat] Groq model '{model_name}' generated answer.")
                        return answer
                except Exception as ex:
                    logger.warning(f"[statement_chat] Groq model '{model_name}' failed: {ex}")
        except Exception as e:
            logger.warning(f"[statement_chat] Groq client init failed: {e}")

    # Tier 2: Try Zhipu AI GLM API
    if Config.GLM_OCR_API_KEY and not answer:
        try:
            headers = {"Authorization": f"Bearer {Config.GLM_OCR_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": Config.GLM_TEXT_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }
            resp = requests.post("https://open.bigmodel.cn/api/paas/v4/chat/completions", json=payload, headers=headers, timeout=3.5)
            if resp.status_code == 200:
                data = resp.json()
                answer = data["choices"][0]["message"]["content"].strip()
                if answer:
                    logger.info("[statement_chat] Zhipu AI GLM model generated answer.")
                    return answer
        except Exception as e:
            logger.warning(f"[statement_chat] GLM API failed: {e}")

    # Tier 3: Rich Rule-Based Financial Advisor Fallback
    logger.info("[statement_chat] Using Rich Rule-Based Advisor Fallback.")
    q_lower = question.lower()

    # Intent A: Loan Eligibility & When Can I Get a Loan
    if any(k in q_lower for k in ["loan", "eligible", "eligibility", "borrow", "lender", "limit", "when can", "approval", "qualify"]):
        if score_val >= 70:
            return (
                f"Based on your calculated ScoreZero rating of **{score_val}/100 ({score_band})** across {max(1, hist_count)} statement(s) evaluated:\n\n"
                f"✅ **Loan Approval Status: HIGH READINESS / PRE-APPROVED**\n"
                f"• **Credit Risk**: Low. Your score of {score_val}/100 comfortably exceeds the standard lender threshold of **70/100**.\n"
                f"• **Estimated Loan Cap**: Eligible for unsecured credit limits up to **₹{int(max(total_income, 25000) * 4):,}** (approx 4x monthly income).\n"
                f"• **Key Drivers**: Strong Income Regularity ({ir}/100) and clean Bounce Discipline ({bf}/100).\n"
                f"• **Next Steps**: Apply directly with lending partners or download your ScoreZero PDF report to present to underwriters."
            )
        elif score_val >= 50:
            points_needed = 70 - score_val
            return (
                f"Based on your calculated ScoreZero score of **{score_val}/100 ({score_band})** {trend_note}:\n\n"
                f"⚠️ **Loan Approval Status: CONDITIONAL (30–60 Days Target)**\n"
                f"• **Current Benchmark**: You are at **{score_val}/100**. Pre-approval for unsecured loans requires a score of **70/100** (**+{points_needed} points** improvement needed).\n"
                f"• **Key Bottlenecks**: {lowest_metric[0]} ({lowest_metric[1]}/100) and Savings Ratio ({sr}/100).\n"
                f"• **Estimated Timeline to Qualify**: **30 to 60 days** of disciplined bank statement management.\n\n"
                f"📋 **Action Plan to Reach Approval Threshold (70/100)**:\n"
                f"1. **Zero-Bounce Buffer**: Maintain a ₹5,000+ minimum balance buffer to prevent auto-debit/EMI bounce penalties.\n"
                f"2. **Boost Savings Buffer**: Cap discretionary transfers below 25% of monthly income to elevate your Savings Ratio above 60/100.\n"
                f"3. **Income Consolidation**: Ensure all primary salary/gig earnings deposit into one central account."
            )
        else:
            points_needed = 70 - score_val
            return (
                f"Based on your calculated ScoreZero rating of **{score_val}/100 ({score_band})**:\n\n"
                f"❌ **Loan Approval Status: NOT YET ELIGIBLE (BUILDING PHASE)**\n"
                f"• **Points Gap**: Your score is **{score_val}/100**. Pre-approval for loans requires **70/100** (a gap of **+{points_needed} points**).\n"
                f"• **Primary Bottleneck**: Low {lowest_metric[0]} ({lowest_metric[1]}/100) and high outflow relative to deposits.\n"
                f"• **Estimated Timeline**: **60 to 90 days** of consistent financial improvement.\n\n"
                f"📋 **3-Step Remedial Plan to Qualify**:\n"
                f"1. **Eliminate All NSF/Bounce Penalties**: Keep a standing balance buffer of ₹5,000+ at all times ({bf}/100).\n"
                f"2. **Trim Discretionary Outflow**: Reduce non-essential transfers by 20% to build positive savings ({sr}/100).\n"
                f"3. **Build 90-Day Stable Track Record**: Maintain steady deposit regularity over 3 consecutive months."
            )

    # Intent B: What Should I Do / Remedies / How to Improve
    if any(k in q_lower for k in ["do", "should i", "remedy", "remedies", "improve", "action", "how to", "step", "plan", "guide"]):
        rem1 = recs[0] if len(recs) > 0 else f"Address {lowest_metric[0]} ({lowest_metric[1]}/100) by keeping positive monthly savings."
        rem2 = recs[1] if len(recs) > 1 else f"Maintain zero-bounce discipline ({bf}/100) with a standing ₹5,000 buffer."
        rem3 = recs[2] if len(recs) > 2 else f"Cap non-essential spending below 25% of income to boost your Savings Ratio ({sr}/100)."
        return (
            f"Here is your personalized ScoreZero action plan based on your calculated score of **{score_val}/100 ({score_band})** {trend_note}:\n\n"
            f"🎯 **Priority Action Steps**:\n"
            f"1. **Primary Growth Area**: {rem1}\n"
            f"2. **Bounce Discipline**: {rem2}\n"
            f"3. **Savings & Spending**: {rem3}\n\n"
            f"📊 **Historical Evaluation**: Analyzed across {max(1, hist_count)} statement(s) (Historical Average: **{avg_hist_score}/100**)."
        )

    # Intent C: Expenses & Spending Breakdown
    if any(k in q_lower for k in ["expense", "spend", "vendor", "outflow", "drain", "where"]):
        return (
            f"Here is your statement spending breakdown (Total Outflow: **₹{total_expense:,.2f}**):\n\n"
            f"💸 **Discipline Metrics**:\n"
            f"• **Spending Discipline Score**: {sd}/100\n"
            f"• **Savings Ratio Score**: {sr}/100\n"
            f"• **Discretionary Spending**: ~{max(0, 100 - sr)}% of total deposits.\n"
            f"• **Recommendation**: Cap discretionary expense categories at 25% of total inflow to boost your overall rating by +10 to +15 points."
        )

    # Intent D: Income & Deposits
    if any(k in q_lower for k in ["income", "salary", "deposit", "credit", "earn"]):
        return (
            f"Here is your income profile based on your bank statement (Total Inflow: **₹{total_income:,.2f}**):\n\n"
            f"📥 **Income Regularity Profile**:\n"
            f"• **Income Regularity Score**: {ir}/100 ({score_band})\n"
            f"• **Total Deposits Extracted**: ₹{total_income:,.2f} across {income_count} deposit entries.\n"
            f"• **Recommendation**: Consolidate salary/gig credits into one central account to maximize Income Regularity for loan underwriting."
        )

    # Intent E: Bounce & Penalties
    if any(k in q_lower for k in ["bounce", "penalty", "charge", "nsf", "emi"]):
        status = "Clean! No bounce penalty incidents detected." if bf >= 90 else "Warning: Bounce/NSF incidents detected."
        return (
            f"Here is your bounce & penalty risk analysis:\n\n"
            f"🚨 **Bounce Discipline Score**: {bf}/100\n"
            f"• **Status**: {status}\n"
            f"• **Recommendation**: Always maintain a ₹5,000+ balance buffer prior to scheduled EMI and auto-debit dates."
        )

    # Default General Response
    rem_default = recs[0] if recs else "Maintain consistent deposit regularity and a 20%+ monthly savings ratio to build 70+ loan approval readiness."
    return (
        f"Regarding **'{question}'**:\n\n"
        f"📊 **ScoreZero Financial Overview**:\n"
        f"• **Current Rating**: **{score_val}/100 ({score_band})** {trend_note}\n"
        f"• **Historical Average**: **{avg_hist_score}/100** across {max(1, hist_count)} evaluated statement(s).\n"
        f"• **Statement Totals**: Inflow ₹{total_income:,.2f} | Outflow ₹{total_expense:,.2f}\n"
        f"• **Primary Strength**: {highest_metric[0]} ({highest_metric[1]}/100)\n"
        f"• **Key Focus Area**: {lowest_metric[0]} ({lowest_metric[1]}/100)\n\n"
        f"💡 **Advisor Advice**: {rem_default}"
    )

