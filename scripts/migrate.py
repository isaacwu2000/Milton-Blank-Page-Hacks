import os
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import store
import psycopg
with psycopg.connect(os.environ.get('DATABASE_URL_UNPOOLED',os.environ['DATABASE_URL']), connect_timeout=15) as con:
    con.execute("SET statement_timeout = '20s'")
    con.execute("SET lock_timeout = '10s'")
    con.execute((store.ROOT/'server/migrations/001_initial.sql').read_text())
print('Initial database schema ready.')
