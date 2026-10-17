import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "Web/backend"))
import psycopg

from server import config
from server.env import load_environment

load_environment()

with psycopg.connect(
    os.getenv("DATABASE_URL_UNPOOLED") or os.environ["DATABASE_URL"],
    connect_timeout=3,
) as con:
    con.execute("SET statement_timeout = '20s'")
    con.execute("SET lock_timeout = '10s'")
    con.execute((config.BACKEND_ROOT / "server/migrations/001_initial.sql").read_bytes())
print("Initial database schema ready.")
