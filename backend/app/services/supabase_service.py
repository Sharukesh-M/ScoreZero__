import logging
from datetime import datetime, timezone
from supabase import create_client, Client
from app.config import Config

logger = logging.getLogger(__name__)

def get_supabase_admin() -> Client:
    url = Config.SUPABASE_URL
    key = Config.SUPABASE_SERVICE_ROLE_KEY or Config.SUPABASE_ANON_KEY
    if not url or not key:
        logger.warning("[Supabase] URL or Key missing in configuration")
    return create_client(url, key)

supabase_admin: Client = get_supabase_admin()

# ─── Upload Operations ────────────────────────────────────────────────────────

def create_upload(upload_id: str, user_id: str, file_name: str, file_size_bytes: int):
    data = {
        "upload_id": upload_id,
        "user_id": user_id,
        "file_name": file_name,
        "file_path": f"memory://{upload_id}",
        "file_size_bytes": file_size_bytes,
        "status": "processing",
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    res = supabase_admin.table("uploads").insert(data).execute()
    return res.data[0] if res.data else data

def update_upload_status(upload_id: str, status: str, statement_start_date=None, statement_end_date=None):
    # Supabase uploads table check constraint allows: 'processing', 'completed', 'failed', 'low_confidence'
    db_status = status
    if status in ["extraction_failed", "incomplete_statement_type", "insufficient_data"]:
        db_status = "failed"

    patch = {"status": db_status}
    if statement_start_date:
        patch["statement_start_date"] = statement_start_date
    if statement_end_date:
        patch["statement_end_date"] = statement_end_date

    try:
        supabase_admin.table("uploads").update(patch).eq("upload_id", upload_id).execute()
    except Exception as e:
        logger.warning(f"[Supabase] update_upload_status warning ({status}): {e}")

def get_upload(upload_id: str, user_id: str):
    res = supabase_admin.table("uploads").select("*").eq("upload_id", upload_id).eq("user_id", user_id).is_("deleted_at", None).execute()
    return res.data[0] if res.data else None

def list_uploads(user_id: str):
    res = supabase_admin.table("uploads").select("upload_id, file_name, status, uploaded_at").eq("user_id", user_id).is_("deleted_at", None).order("uploaded_at", desc=True).execute()
    return res.data or []

def soft_delete_upload(upload_id: str, user_id: str):
    supabase_admin.table("uploads").update({"deleted_at": datetime.now(timezone.utc).isoformat()}).eq("upload_id", upload_id).eq("user_id", user_id).execute()

# ─── Score Operations ─────────────────────────────────────────────────────────

def upsert_score(upload_id: str, user_id: str, metrics: dict):
    data = {
        "upload_id": upload_id,
        "user_id": user_id,
        "income_regularity_score": metrics.get("income_regularity_score", 0),
        "savings_ratio_score": metrics.get("savings_ratio_score", 0),
        "spending_discipline_score": metrics.get("spending_discipline_score", 0),
        "bounce_frequency_score": metrics.get("bounce_frequency_score", 0),
        "balance_trend_score": metrics.get("balance_trend_score", 0),
        "score_value": metrics.get("score_value", 0),
        "score_band": metrics.get("score_band", "Fair"),
        "calculated_at": datetime.now(timezone.utc).isoformat()
    }
    res = supabase_admin.table("scores").upsert(data, on_conflict="upload_id").execute()
    return res.data[0] if res.data else data

def get_latest_score(user_id: str):
    res = supabase_admin.table("scores").select("*").eq("user_id", user_id).order("calculated_at", desc=True).limit(1).execute()
    return res.data[0] if res.data else None

def get_score_history(user_id: str, limit=10, offset=0):
    res = supabase_admin.table("scores").select("*", count="exact").eq("user_id", user_id).order("calculated_at", desc=True).range(offset, offset + limit - 1).execute()
    return res.data or [], res.count or 0

def get_score_by_id(score_id: str, user_id: str):
    res = supabase_admin.table("scores").select("*").eq("score_id", score_id).eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

# ─── Recommendation Operations ────────────────────────────────────────────────

def upsert_recommendation(score_id: str, explanation_text: str, items, ai_generated=True):
    data = {
        "score_id": score_id,
        "explanation_text": explanation_text,
        "items": items,
        "ai_generated": ai_generated,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    res = supabase_admin.table("recommendations").upsert(data, on_conflict="score_id").execute()
    return res.data[0] if res.data else data

def get_recommendation(score_id: str):
    res = supabase_admin.table("recommendations").select("*").eq("score_id", score_id).execute()
    return res.data[0] if res.data else None

def get_upload_with_score(upload_id: str, user_id: str):
    upload = get_upload(upload_id, user_id)
    if not upload:
        return None
    score = None
    recommendation = None
    if upload.get("status") in ["completed", "low_confidence"]:
        res_score = supabase_admin.table("scores").select("*").eq("upload_id", upload_id).execute()
        if res_score.data:
            score = res_score.data[0]
            recommendation = get_recommendation(score["score_id"])
    return {"upload": upload, "score": score, "recommendation": recommendation}
