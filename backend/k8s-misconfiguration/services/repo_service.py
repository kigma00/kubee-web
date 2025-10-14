import os
import shutil
import uuid
from typing import Optional
from git import Repo
from config import Config


class RepoService:
    """Service responsible for cloning GitHub repositories to a temporary location."""

    def __init__(self, base_tmp_dir: Optional[str] = None) -> None:
        self.base_tmp_dir = base_tmp_dir or Config.CLONE_BASE_DIR
        os.makedirs(self.base_tmp_dir, exist_ok=True)

    def is_valid_github_url(self, url: str) -> bool:
        if not url or not isinstance(url, str):
            return False
        if url.startswith("https://github.com/"):
            return True
        if url.startswith("git@github.com:"):
            return True
        return False

    def clone_repo(self, url: str) -> str:
        if not self.is_valid_github_url(url):
            raise ValueError("Invalid GitHub URL.")

        dest_dir = os.path.join(self.base_tmp_dir, str(uuid.uuid4()))
        Repo.clone_from(url, dest_dir)
        return dest_dir

    def cleanup(self, path: str) -> None:
        if path and os.path.isdir(path) and path.startswith(self.base_tmp_dir):
            shutil.rmtree(path, ignore_errors=True)
