"""Postgres records and branch-scoped private object storage; credentials never reach clients."""
import json
import os
from pathlib import Path
from functools import lru_cache
import boto3
from botocore.config import Config
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env.local')
load_dotenv(ROOT / '.env')
BUCKET = os.getenv('STORAGE_BUCKET', 'videos')

@lru_cache
def pool():
    url = os.getenv('DATABASE_URL')
    if not url:
        raise RuntimeError('DATABASE_URL is missing. Add Neon credentials to .env.local.')
    return ConnectionPool(url, min_size=0, max_size=4, timeout=15, kwargs={'connect_timeout': 10})

@lru_cache
def s3():
    if not os.getenv('AWS_ENDPOINT_URL_S3'):
        raise RuntimeError('Neon Object Storage credentials are missing.')
    return boto3.client('s3', endpoint_url=os.environ['AWS_ENDPOINT_URL_S3'], region_name=os.getenv('AWS_REGION', 'us-east-1'), config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}, request_checksum_calculation='when_required', response_checksum_validation='when_required', connect_timeout=10, read_timeout=40))

def records(kind):
    with pool().connection() as con:
        return [r[0] for r in con.execute('SELECT payload FROM sportsbuilder_records WHERE kind=%s ORDER BY created_at DESC', (kind,))]

def get(kind, record_id):
    with pool().connection() as con:
        row = con.execute('SELECT payload FROM sportsbuilder_records WHERE kind=%s AND id=%s', (kind,record_id)).fetchone()
        return row[0] if row else None

def save(kind, value):
    with pool().connection() as con:
        con.execute('INSERT INTO sportsbuilder_records(kind,id,payload) VALUES(%s,%s,%s) ON CONFLICT(kind,id) DO UPDATE SET payload=EXCLUDED.payload', (kind,value['id'],Jsonb(value)))
    return value

def delete(kind, record_id):
    with pool().connection() as con:
        con.execute('DELETE FROM sportsbuilder_records WHERE kind=%s AND id=%s',(kind,record_id))

def put(key, data, content_type):
    s3().put_object(Bucket=BUCKET, Key=key, Body=data, ContentType=content_type)

def read(key):
    return s3().get_object(Bucket=BUCKET, Key=key)['Body'].read()

def url(key):
    return s3().generate_presigned_url('get_object', Params={'Bucket':BUCKET,'Key':key}, ExpiresIn=900)

def remove(key):
    s3().delete_object(Bucket=BUCKET,Key=key)
