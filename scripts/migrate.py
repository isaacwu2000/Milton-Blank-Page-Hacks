import os
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import store
import psycopg
with psycopg.connect(os.environ['DATABASE_URL_UNPOOLED']) as con:
    con.execute((store.ROOT/'server/migrations/001_initial.sql').read_text())
print('Initial database schema ready.')
