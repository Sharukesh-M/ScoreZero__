import uuid
import threading
import logging
from flask import Blueprint, request, jsonify
from app.config import Config
from app.middleware.auth_middleware import require_auth
from app.services import supabase_service
from app.services.pdf_parser import parse_pdf_buffer, check_minimum_thresholds, check_statement_type, reconcile_header_totals
from app.services.scoring_engine import calculate_metrics
from app.services.groq_service import generate_recommendations

logger = logging.getLogger(__name__)
upload_bp = Blueprint('uploads', __name__)

# Temporary in-memory cache for uploaded PDF buffers & parsed extraction results
pdf_buffer_cache = {}
parsed_results_cache = {}

def process_upload_async(upload_id: str, user_id: str, pdf_bytes: bytes, password: str = None, user_question: str = None):
    """
    Task 4 — Pipeline Gating Order:
    1. Extract transactions → if incomplete / extraction_failed, STOP → return extraction_failed
    2. Check statement type → if flagged (receipts-only, no balance), STOP → return incomplete_statement_type
    3. Check minimum data thresholds → if failed (insufficient transactions/span/income), STOP → return insufficient_data
    4. Only then: run Layer 1 metric calculations → Layer 2 Groq explanation
    """
    try:
        # Gate 1: Layout-aware extraction & declared row count validation
        parse_res = parse_pdf_buffer(pdf_bytes, password)
        transactions = parse_res.get("transactions", [])
        sample_text = parse_res.get("raw_text_sample", "")

        if parse_res.get("status") == "extraction_failed":
            supabase_service.update_upload_status(upload_id, "extraction_failed")
            parsed_results_cache[upload_id] = {
                "status": "extraction_failed",
                "error": parse_res.get("message") or parse_res.get("reason"),
                "gate_stopped": "Task 6 — Hard Reject Extraction Gate",
                "extracted_count": parse_res.get("extracted_count", 0),
                "declared_count": parse_res.get("declared_count"),
                "transactions": [],
                "raw_text_sample": sample_text
            }
            logger.warning(f"[async_upload] Gate 1 Extraction Failed for {upload_id}: {parse_res.get('reason')}")
            return

        is_low_confidence = False
        warning_msg = None

        # Gate 2: Header Totals Reconciliation Gate (Task 2 — Check <= 2% variance)
        reconcile_res = reconcile_header_totals(transactions, sample_text)
        if reconcile_res.get("status") == "extraction_integrity_failed":
            is_low_confidence = True
            if not warning_msg:
                warning_msg = "Extracted transaction totals differ from statement header totals — score calculated with low confidence."
            logger.warning(f"[async_upload] Header Reconciliation Mismatch for {upload_id}: {reconcile_res.get('details')}")

        # Check Statement Type & Data Sufficiency
        stmt_type_res = check_statement_type(transactions, sample_text)
        if stmt_type_res.get("status") == "incomplete_statement_type":
            is_low_confidence = True
            warning_msg = "Receipts-only statement detected (money received only, 0 debits) — score penalized due to missing spending history."

        threshold_res = check_minimum_thresholds(transactions, parse_res.get("statement_days", 0))
        if threshold_res.get("status") == "insufficient_data":
            is_low_confidence = True
            if not warning_msg:
                warning_msg = "Short statement period or low transaction volume — score calculated with low confidence."

        # Layer 1 Metric Calculations + Layer 2 AI Recommendation
        start_date = parse_res["statement_start_date"]
        end_date = parse_res["statement_end_date"]
        metrics = calculate_metrics(transactions)

        score_record = supabase_service.upsert_score(upload_id, user_id, metrics)
        score_id = score_record.get("score_id")

        rec_res = generate_recommendations(metrics, metrics["score_value"], metrics["score_band"], user_question=user_question)
        supabase_service.upsert_recommendation(
            score_id=score_id,
            explanation_text=rec_res["explanation"],
            items=rec_res,
            ai_generated=rec_res["ai_generated"]
        )

        parsed_results_cache[upload_id] = {
            "status": "low_confidence" if is_low_confidence else "completed",
            "warning": warning_msg,
            "gate_stopped": None,
            "transactions": transactions,
            "raw_text_sample": sample_text
        }

        final_status = "low_confidence" if is_low_confidence else "completed"
        supabase_service.update_upload_status(upload_id, final_status, start_date, end_date)
        logger.info(f"[async_upload] Upload {upload_id} scored: {metrics['score_value']}/100 ({metrics['score_band']}) [status={final_status}]")

    except Exception as e:
        logger.error(f"[async_upload] Failed processing upload {upload_id}: {e}")
        supabase_service.update_upload_status(upload_id, "failed")
    finally:
        pdf_buffer_cache.pop(upload_id, None)

# ─── 1. Async Upload Endpoint (for Node client & Neumorphism dashboard) ───────
@upload_bp.route('/statements/upload', methods=['POST'])
@require_auth
def upload_statement():
    file = request.files.get('pdf') or request.files.get('file')
    if not file:
        return jsonify({"error": "No PDF file provided. Please attach a file.", "code": "NO_FILE"}), 400

    filename = file.filename or 'statement.pdf'
    if not filename.lower().endswith('.pdf'):
        return jsonify({"error": "Invalid file format. Please upload a PDF.", "code": "INVALID_FILE_TYPE"}), 400

    pdf_bytes = file.read()
    if len(pdf_bytes) > Config.MAX_UPLOAD_SIZE_BYTES:
        return jsonify({"error": f"File exceeds {Config.MAX_UPLOAD_SIZE_MB} MB limit.", "code": "FILE_TOO_LARGE"}), 413

    upload_id = str(uuid.uuid4())
    password = request.form.get('optional_password') or request.form.get('password')
    user_question = request.form.get('user_question') or request.form.get('question') or request.form.get('custom_query')

    supabase_service.create_upload(upload_id, request.user_id, filename, len(pdf_bytes))
    pdf_buffer_cache[upload_id] = pdf_bytes

    # Start background processing thread
    t = threading.Thread(target=process_upload_async, args=(upload_id, request.user_id, pdf_bytes, password, user_question))
    t.daemon = True
    t.start()

    return jsonify({
        "upload_id": upload_id,
        "status": "processing",
        "message": f"Processing your statement. Poll /statements/{upload_id}/status for results."
    }), 202

@upload_bp.route('/statements/<upload_id>/status', methods=['GET'])
@require_auth
def get_statement_status(upload_id):
    res = supabase_service.get_upload_with_score(upload_id, request.user_id)
    if not res:
        return jsonify({"error": "Upload not found.", "code": "FORBIDDEN"}), 404

    upload = res["upload"]
    score = res["score"]
    recommendation = res["recommendation"]
    cached_parsed = parsed_results_cache.get(upload_id, {})

    response = {
        "upload_id": upload["upload_id"],
        "status": cached_parsed.get("status") or upload["status"],
        "gate_stopped": cached_parsed.get("gate_stopped"),
        "error": cached_parsed.get("error"),
        "detected_issue": cached_parsed.get("detected_issue"),
        "reasons": cached_parsed.get("reasons", []),
        "extracted_transactions": cached_parsed.get("transactions", []),
        "raw_text_sample": cached_parsed.get("raw_text_sample", "")
    }

    if score and upload["status"] in ["completed", "low_confidence"]:
        rec_items = recommendation.get("items") if recommendation else {}
        is_dict = isinstance(rec_items, dict)

        explanation = recommendation.get("explanation_text") if recommendation else None
        recs = (rec_items.get("recommendations") or rec_items.get("items")) if is_dict else (rec_items if isinstance(rec_items, list) else [])
        insights = rec_items.get("insights", []) if is_dict else []
        priority = rec_items.get("priority", "medium") if is_dict else "medium"
        timeframe = rec_items.get("timeframe", "1 month") if is_dict else "1 month"
        custom_question_answer = rec_items.get("custom_question_answer") if is_dict else None
        user_question = rec_items.get("user_question") if is_dict else None

        response["score"] = {
            "score_id": score["score_id"],
            "score_value": score["score_value"],
            "score_band": score["score_band"],
            "metrics": {
                "income_regularity": score["income_regularity_score"],
                "savings_ratio": score["savings_ratio_score"],
                "spending_discipline": score["spending_discipline_score"],
                "bounce_frequency": score["bounce_frequency_score"],
                "balance_trend": score["balance_trend_score"]
            },
            "explanation": explanation,
            "recommendations": recs,
            "insights": insights,
            "priority": priority,
            "timeframe": timeframe,
            "user_question": user_question,
            "custom_question_answer": custom_question_answer,
            "ai_generated": recommendation.get("ai_generated", False) if recommendation else False,
            "calculated_at": score["calculated_at"],
            "loan_assessment": (rec_items.get("loan_assessment") if is_dict else None) or score.get("loan_tier") or score.get("loan_assessment")
        }
        if cached_parsed.get("warning"):
            response["warning"] = cached_parsed.get("warning")
        elif upload["status"] == "low_confidence":
            response["warning"] = "Low confidence extraction — short statement period or low transaction volume."

    if upload["status"] == "failed" and not response.get("error"):
        response["error"] = "PDF processing failed. Please try a different statement."

    return jsonify(response), 200

# ─── 3. Delete Statement/Score History Record Endpoint ────────────────────────
@upload_bp.route('/statements/<identifier>', methods=['DELETE'])
@upload_bp.route('/api/statements/<identifier>', methods=['DELETE'])
@upload_bp.route('/scores/<identifier>', methods=['DELETE'])
@upload_bp.route('/api/scores/<identifier>', methods=['DELETE'])
@require_auth
def delete_statement_endpoint(identifier):
    if not identifier or str(identifier).strip().lower() in ['undefined', 'null', 'none']:
        return jsonify({"error": "Invalid statement identifier provided.", "code": "INVALID_ID"}), 400
    if not identifier or identifier == 'undefined':
        return jsonify({"error": "Invalid identifier provided.", "code": "VALIDATION_ERROR"}), 400

    try:
        supabase_service.soft_delete_upload(identifier, request.user_id)
    except Exception as e:
        logger.warning(f"[delete_endpoint] soft_delete_upload warning: {e}")

    try:
        supabase_service.supabase_admin.table("scores").delete().eq("score_id", identifier).eq("user_id", request.user_id).execute()
        supabase_service.supabase_admin.table("scores").delete().eq("upload_id", identifier).eq("user_id", request.user_id).execute()
    except Exception as e:
        logger.warning(f"[delete_endpoint] scores delete warning: {e}")

    parsed_results_cache.pop(identifier, None)
    return jsonify({"status": "deleted", "identifier": identifier}), 200

# ─── 4. Interactive Statement Q&A AI Chat Endpoint ───────────────────────────
@upload_bp.route('/statements/<upload_id>/chat', methods=['POST'])
@upload_bp.route('/api/statements/<upload_id>/chat', methods=['POST'])
@require_auth
def chat_with_statement(upload_id):
    data = request.get_json() or {}
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"error": "Question is required."}), 400

    cached = parsed_results_cache.get(upload_id) or {}
    transactions = cached.get("transactions") or []

    if not transactions and upload_id:
        upload = supabase_service.get_upload(upload_id, request.user_id)
        if upload:
            scores, _ = supabase_service.get_score_history(request.user_id, limit=50)
            target_score = next((s for s in scores if s.get("upload_id") == upload_id), None)
            if target_score:
                transactions = target_score.get("extracted_transactions") or []

    tx_summary = []
    for t in transactions[:150]:
        tx_summary.append(f"{t.get('date', 'N/A')} | {t.get('transaction_type', 'Tx')}: ₹{t.get('amount', 0):,.2f} | Desc: {t.get('description', 'N/A')} | Cat: {t.get('category', 'N/A')}")

    context_str = "\n".join(tx_summary) if tx_summary else "No detailed transaction table available for this statement."

    system_prompt = f"""You are ScoreZero AI Statement Assistant. Answer the user's question about their uploaded PDF statement accurately based on the transaction data provided below.
If the answer is found in the data, provide specific numbers (₹ amounts, dates, categories). Keep answers concise and direct.

Statement Transactions Context:
{context_str}
"""

    answer = "I couldn't analyze the statement context right now."
    if Config.GROQ_API_KEY:
        try:
            client = Groq(api_key=Config.GROQ_API_KEY)
            resp = client.chat.completions.create(
                model=Config.GROQ_MODEL or "llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                max_tokens=400,
                temperature=0.3
            )
            answer = resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"[chat_endpoint] Groq API call failed: {e}")
            answer = f"Based on your statement data: total transactions = {len(transactions)}. Please ask about specific amounts, vendors, or dates."

    return jsonify({"answer": answer, "question": question, "upload_id": upload_id}), 200
