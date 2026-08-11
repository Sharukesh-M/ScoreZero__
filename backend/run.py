import logging
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS configuration allowing local frontend development origins
    CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

    # Import blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.upload_routes import upload_bp
    from app.routes.score_routes import score_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(upload_bp)
    app.register_blueprint(score_bp)

    @app.route('/health', methods=['GET'])
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "ok",
            "service": "scorezero-python-backend",
            "version": "2.0.0",
            "ocr_engine": "GLM-OCR / ZhipuAI (glm-4v-flash)",
            "ai_engine": "Groq (mixtral-8x7b-32768)"
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found.", "code": "NOT_FOUND"}), 404

    @app.errorhandler(500)
    def server_error(e):
        logger.error(f"Internal Server Error: {e}")
        return jsonify({"error": "Internal server error.", "code": "INTERNAL_ERROR"}), 500

    return app

app = create_app()

if __name__ == '__main__':
    port = Config.PORT
    print('\n╔══════════════════════════════════════════════════╗')
    print(f'║  🐍 ScoreZero Python Backend listening on :{port}  ║')
    print(f'║  🤖 GLM-OCR Engine: Enabled (ZhipuAI API)       ║')
    print(f'║  ⚡ Groq AI Engine: Enabled (Mixtral 8x7b)        ║')
    print(f'║  🔗 Health: http://localhost:{port}/health          ║')
    print('╚══════════════════════════════════════════════════╝\n')
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
