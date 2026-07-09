import os
import sys

from chromadb.cli.cli import app

os.environ.setdefault("CHROMA_SERVER_CORS_ALLOW_ORIGINS", '["*"]')
sys.argv = [
    "chroma",
    "run",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
    "--path",
    "chroma-data",
]

app()
