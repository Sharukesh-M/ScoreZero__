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
