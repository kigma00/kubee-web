import os
from flask import Blueprint, jsonify, Response


systemController = Blueprint("system", __name__)


@systemController.get("/")
def root_handler():
    return jsonify({
        "name": "k8s-misconfig-scanner",
        "endpoints": ["GET /scan?repo-url=...", "GET /healthy"],
    })


@systemController.get("/healthy")
def healthy_handler():
    file_path = os.path.join(os.path.dirname(__file__), "data", "api-docs.json")
    try:
        with open(file_path, "r", encoding="utf-8") as json_file:
            json_data = json_file.read()
        return Response(json_data, content_type="application/json")
    except FileNotFoundError:
        return jsonify({"status": "ok"})
