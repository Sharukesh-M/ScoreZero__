import base64
import logging
import requests
from app.config import Config

logger = logging.getLogger(__name__)

def ocr_image_with_glm(image_bytes: bytes, prompt: str = None) -> str:
    """
    Performs OCR and document parsing on image bytes using GLM-4V / GLM-OCR Vision Model from Zhipu AI.
    API Key: Config.GLM_OCR_API_KEY
    """
    if not Config.GLM_OCR_API_KEY:
        logger.warning("[GLM-OCR] GLM_OCR_API_KEY is not set.")
        return ""

    if not prompt:
        prompt = (
            "Extract all text and financial transactions from this bank statement image. "
            "Preserve date, description/payee, credit/debit transaction type, amount, and balance if present."
        )

    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    # Method 1: Try using the official zhipuai SDK
    try:
        from zhipuai import ZhipuAI
        client = ZhipuAI(api_key=Config.GLM_OCR_API_KEY)
        response = client.chat.completions.create(
            model=Config.GLM_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            temperature=0.1
        )
        if response and response.choices and len(response.choices) > 0:
            extracted = response.choices[0].message.content
            logger.info(f"[GLM-OCR] Successfully extracted {len(extracted)} chars via ZhipuAI SDK")
            return extracted
    except Exception as e:
        logger.warning(f"[GLM-OCR] ZhipuAI SDK call failed ({e}), falling back to direct HTTP API")

    # Method 2: Direct HTTP Request to BigModel API
    try:
        headers = {
            "Authorization": f"Bearer {Config.GLM_OCR_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": Config.GLM_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            "temperature": 0.1
        }
        url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
        resp = requests.post(url, json=payload, headers=headers, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            extracted = data["choices"][0]["message"]["content"]
            logger.info(f"[GLM-OCR] Successfully extracted {len(extracted)} chars via HTTP API")
            return extracted
        else:
            logger.error(f"[GLM-OCR] HTTP API error {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"[GLM-OCR] Direct HTTP call failed: {e}")

    return ""
