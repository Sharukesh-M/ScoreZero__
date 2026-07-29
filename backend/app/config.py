import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    PORT = int(os.getenv('PORT', 5000))
    ENV = os.getenv('FLASK_ENV', 'development')
    CORS_ORIGINS = [s.strip() for s in os.getenv('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174').split(',') if s.strip()]

    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL', '')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', '')

    # Groq AI
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
    GROQ_TIMEOUT_MS = int(os.getenv('GROQ_TIMEOUT_MS', 4000))

    # GLM-OCR / Zhipu AI
    GLM_OCR_API_KEY = os.getenv('GLM_OCR_API_KEY', 'c7607ade77c54c709d7befffb85fc284.iB8pc6aJVJdQ8UDL')
    GLM_MODEL = os.getenv('GLM_MODEL', 'glm-4v')
    GLM_TEXT_MODEL = os.getenv('GLM_TEXT_MODEL', 'glm-4-flash')

    # Uploads
    MAX_UPLOAD_SIZE_MB = int(os.getenv('MAX_UPLOAD_SIZE_MB', 15))
    MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
