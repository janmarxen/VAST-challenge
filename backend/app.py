"""
Main Flask application entry point.
Orchestrates the three modular routers: business, resident, employer.
"""
from flask import Flask
from flask_cors import CORS

from routers import business_router, resident_router, employer_router

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Register blueprints (modular routers)
app.register_blueprint(business_router.bp, url_prefix='/api/business')
app.register_blueprint(resident_router.bp, url_prefix='/api/resident')
app.register_blueprint(employer_router.bp, url_prefix='/api/employer')

@app.route('/health')
def health_check():
    """Health check endpoint for Docker"""
    return {'status': 'healthy'}, 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
