from flask import Flask
from config import Config

app = Flask(__name__)

# Register blueprints
from controllers.scan_controller import scanController
from controllers.system_controller import systemController
app.register_blueprint(scanController)
app.register_blueprint(systemController)


if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
