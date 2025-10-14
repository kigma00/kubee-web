import os


class Config:
    HOST = os.getenv("APP_HOST", "0.0.0.0")
    PORT = int(os.getenv("APP_PORT", "8282"))
    DEBUG = os.getenv("APP_DEBUG", "false").lower() in {"1", "true", "yes"}

    # Base directory for cloning repositories
    CLONE_BASE_DIR = os.getenv("CLONE_BASE_DIR", "/tmp/kube-scan")
