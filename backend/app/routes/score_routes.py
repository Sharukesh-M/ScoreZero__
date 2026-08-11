import json
import logging
from flask import Blueprint, request, jsonify, make_response
from app.config import Config
from app.middleware.auth_middleware import require_auth
from app.services import supabase_service
from app.services.scoring_engine import calculate_metrics
from app.services.groq_service import generate_recommendations, generate_intelligent_statement_chat_response

logger = logging.getLogger(__name__)
score_bp = Blueprint('scores', __name__)

# ─── Compute Score Endpoint (for original client.ts) ───────────────────────────
@score_bp.route('/scores', methods=['POST'])
@score_bp.route('/api/scores', methods=['POST'])
@require_auth
def compute_score():
    data = request.get_json() or {}
    upload_id = data.get('upload_id')
    transactions = data.get('transactions', [])
    low_confidence = data.get('low_confidence', False)

    if not upload_id or not transactions:
        return jsonify({"error": "upload_id and transactions are required.", "code": "VALIDATION_ERROR"}), 400

    metrics = calculate_metrics(transactions)
    score_record = supabase_service.upsert_score(upload_id, request.user_id, metrics)
    score_id = score_record.get("score_id")

    # Generate AI recommendations via Groq
    rec_res = generate_recommendations(metrics, metrics["score_value"], metrics["score_band"])
    supabase_service.upsert_recommendation(
        score_id=score_id,
        explanation_text=rec_res["explanation"],
        items=rec_res,
        ai_generated=rec_res["ai_generated"]
    )

    supabase_service.update_upload_status(upload_id, "scored")

    return jsonify({
        "message": "Score calculated successfully.",
        "score_id": score_id,
        "metrics": {
            "income_regularity": metrics["income_regularity_score"],
            "savings_ratio": metrics["savings_ratio_score"],
            "spending_discipline": metrics["spending_discipline_score"],
            "bounce_frequency": metrics["bounce_frequency_score"],
            "balance_trend": metrics["balance_trend_score"],
            "score_value": metrics["score_value"],
            "score_band": metrics["score_band"]
        }
    }), 200

# ─── Latest Score ─────────────────────────────────────────────────────────────
@score_bp.route('/scores/latest', methods=['GET'])
@score_bp.route('/api/scores/latest', methods=['GET'])
@require_auth
def get_latest_score_endpoint():
    score = supabase_service.get_latest_score(request.user_id)
    if not score:
        return jsonify({"score": None}), 200

    recommendation = supabase_service.get_recommendation(score["score_id"])
    rec_items = recommendation.get("items") if recommendation else {}
    is_dict = isinstance(rec_items, dict)

    explanation = recommendation.get("explanation_text") if recommendation else None
    recs = (rec_items.get("recommendations") or rec_items.get("items")) if is_dict else (rec_items if isinstance(rec_items, list) else [])
    insights = rec_items.get("insights", []) if is_dict else []
    priority = rec_items.get("priority", "medium") if is_dict else "medium"
    timeframe = rec_items.get("timeframe", "1 month") if is_dict else "1 month"

    return jsonify({
        "score": {
            "score_id": score["score_id"],
            "upload_id": score["upload_id"],
            "score_value": score["score_value"],
            "score_band": score["score_band"],
            "calculated_at": score["calculated_at"],
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
            "ai_generated": recommendation.get("ai_generated", False) if recommendation else False
        }
    }), 200

# ─── Score History ────────────────────────────────────────────────────────────
@score_bp.route('/scores/history', methods=['GET'])
@score_bp.route('/scores', methods=['GET'])
@score_bp.route('/api/scores', methods=['GET'])
@require_auth
def get_score_history_endpoint():
    limit = min(int(request.args.get('limit', 10)), 50)
    offset = max(int(request.args.get('offset', 0)), 0)

    scores, total_count = supabase_service.get_score_history(request.user_id, limit, offset)
    return jsonify({
        "scores": scores,
        "total_count": total_count
    }), 200

# ─── Get Single Score ──────────────────────────────────────────────────────────
@score_bp.route('/scores/<score_id>', methods=['GET'])
@score_bp.route('/api/scores/<score_id>', methods=['GET'])
@require_auth
def get_single_score(score_id):
    score = supabase_service.get_score_by_id(score_id, request.user_id)
    if not score:
        return jsonify({"error": "Score not found.", "code": "NOT_FOUND"}), 404

    recommendation = supabase_service.get_recommendation(score["score_id"])
    return jsonify({
        "score": {
            "score_id": score["score_id"],
            "upload_id": score["upload_id"],
            "score_value": score["score_value"],
            "score_band": score["score_band"],
            "calculated_at": score["calculated_at"],
            "metrics": {
                "income_regularity": score["income_regularity_score"],
                "savings_ratio": score["savings_ratio_score"],
                "spending_discipline": score["spending_discipline_score"],
                "bounce_frequency": score["bounce_frequency_score"],
                "balance_trend": score["balance_trend_score"]
            },
            "explanation": recommendation.get("explanation_text") if recommendation else None,
            "recommendations": recommendation.get("items", []) if recommendation else [],
            "ai_generated": recommendation.get("ai_generated", False) if recommendation else False
        }
    }), 200

# ─── Recommendations Endpoint ─────────────────────────────────────────────────
@score_bp.route('/recommendations/<score_id>', methods=['GET'])
@score_bp.route('/api/recommendations/<score_id>', methods=['GET'])
@require_auth
def get_recommendations_endpoint(score_id):
    recommendation = supabase_service.get_recommendation(score_id)
    if not recommendation:
        return jsonify({"recommendations": []}), 200

    items = recommendation.get("items", [])
    formatted_items = []
    for idx, item in enumerate(items):
        formatted_items.append({
            "id": f"rec-{idx+1}",
            "text": item,
            "ai_generated": recommendation.get("ai_generated", True),
            "explanation": recommendation.get("explanation_text")
        })

    return jsonify({"recommendations": formatted_items}), 200

# ─── Report Downloading Endpoint ─────────────────────────────────────────────
@score_bp.route('/reports/<score_id>', methods=['GET'])
@score_bp.route('/scores/<upload_id>/report', methods=['POST'])
@score_bp.route('/api/reports/<score_id>', methods=['GET'])
@require_auth
def generate_report(score_id=None, upload_id=None):
    target_id = score_id or upload_id
    if not target_id or str(target_id).strip().lower() in ['undefined', 'null', 'none']:
        return jsonify({"error": "Invalid score identifier provided.", "code": "INVALID_ID"}), 400

    score = supabase_service.get_score_by_id(target_id, request.user_id)
    if not score:
        # Fallback search by upload_id
        scores, _ = supabase_service.get_score_history(request.user_id, limit=100)
        score = next((s for s in scores if s.get("upload_id") == target_id), None)

    if not score:
        return jsonify({"error": "Score report not found.", "code": "NOT_FOUND"}), 404

    recommendation = supabase_service.get_recommendation(score["score_id"])

    report_data = {
        "report": {
            "generated_at": supabase_service.datetime.now().isoformat(),
            "score_id": score["score_id"],
            "score_value": score["score_value"],
            "score_band": score["score_band"],
            "calculated_at": score["calculated_at"],
            "metrics": {
                "income_regularity": score["income_regularity_score"],
                "savings_ratio": score["savings_ratio_score"],
                "spending_discipline": score["spending_discipline_score"],
                "bounce_frequency": score["bounce_frequency_score"],
                "balance_trend": score["balance_trend_score"]
            },
            "explanation": recommendation.get("explanation_text") if recommendation else None,
            "recommendations": recommendation.get("items", []) if recommendation else [],
            "ai_generated": recommendation.get("ai_generated", False) if recommendation else False,
            "disclaimer": "ScoreZero alternative credit score report. Generated in-memory."
        }
    }

    if request.method == 'POST':
        return jsonify(report_data), 200

    # Return JSON file or formatted response
    response = make_response(json.dumps(report_data, indent=2))
    response.headers['Content-Type'] = 'application/json'
    response.headers['Content-Disposition'] = f'attachment; filename=ScoreZero_Report_{score["score_id"][:8]}.json'
    return response

# ─── Inline AI Advisory Chat Endpoint ─────────────────────────────────────────
@score_bp.route('/chat', methods=['POST'])
@score_bp.route('/api/chat', methods=['POST'])
@require_auth
def handle_chat_query():
    data = request.get_json() or {}
    user_msg = (data.get('message') or data.get('question') or '').strip()
    score_ctx = data.get('context')

    if not user_msg:
        return jsonify({"error": "Message is required.", "code": "VALIDATION_ERROR"}), 400

    # 1. Fetch user's score history
    history_scores, _ = supabase_service.get_score_history(request.user_id, limit=50)

    # 2. Derive target score
    target_score = score_ctx if (score_ctx and isinstance(score_ctx, dict)) else (history_scores[0] if history_scores else None)
    transactions = (target_score.get("extracted_transactions") or []) if target_score else []

    reply = generate_intelligent_statement_chat_response(
        question=user_msg,
        score_data=target_score,
        history_scores=history_scores,
        transactions=transactions
    )

    return jsonify({"reply": reply, "answer": reply}), 200

# ─── Danger Zone: Delete Account ─────────────────────────────────────────────
@score_bp.route('/account/delete', methods=['DELETE'])
@score_bp.route('/api/account/delete', methods=['DELETE'])
@require_auth
def delete_account():
    uploads = supabase_service.list_uploads(request.user_id)
    for u in uploads:
        supabase_service.soft_delete_upload(u["upload_id"], request.user_id)
    return jsonify({"message": "User account data deleted successfully."}), 200
