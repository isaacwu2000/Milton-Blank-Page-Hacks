"""Read-only installer check with safe public diagnostics and private tracebacks."""

import sys
import traceback

from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    ConnectionError,
    HTTPClientError,
    NoCredentialsError,
    PartialCredentialsError,
    SSLError,
)

from server import store


def failure_message(error: Exception) -> str:
    """Return static recovery guidance; never echo upstream messages or credentials."""
    if isinstance(error, ClientError):
        code = str(error.response.get("Error", {}).get("Code", ""))
        status = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if code == "InvalidAccessKeyId":
            return "Storage rejected the access key. Use the full Neon storage token_id, not token_id_short."
        if code == "SignatureDoesNotMatch":
            return "Storage rejected the request signature. Check the Neon s3_secret_access_key, not the api_token, and your computer's date and time."
        if code in {"ExpiredToken", "InvalidToken", "TokenRefreshRequired"}:
            return "The storage credential is expired or invalid. Replace the saved storage credentials with a current matching pair."
        if code == "NoSuchBucket" or status == 404:
            return "The videos bucket was not found. Check the storage endpoint and create a private videos bucket on the same Neon branch."
        if code == "AccessDenied" or status in {401, 403}:
            return "Storage denied access. Check that the endpoint and storage credentials belong to the same Neon branch and that the credential has storage:write access."
        if code in {"SlowDown", "ServiceUnavailable", "InternalError"} or status in {
            429,
            500,
            502,
            503,
            504,
        }:
            return "Storage is temporarily unavailable or rate-limited. Wait a moment and run setup again."
    if isinstance(error, SSLError):
        return "The storage connection failed certificate verification. Check your computer's date, time, and trusted certificates or VPN/proxy settings."
    if isinstance(error, (ConnectionError, HTTPClientError)):
        return "Could not connect to video storage. Check NEON_STORAGE_ENDPOINT, your internet connection, and VPN/proxy settings."
    if isinstance(error, (KeyError, ValueError, NoCredentialsError, PartialCredentialsError)):
        return "Storage settings are missing or invalid. Check NEON_STORAGE_ENDPOINT, NEON_STORAGE_ACCESS_KEY_ID, and NEON_STORAGE_SECRET_ACCESS_KEY."
    return "The storage check failed unexpectedly. See the private .sportsbuilder/setup.log for details."


def main() -> int:
    """Check authenticated bucket reads without modifying or printing stored objects.

    Public diagnostics use a fixed prefix consumed by the installer. Raw exception
    details go to stderr, which the installer saves only in its private log.
    """
    try:
        # HEAD errors can omit the service error code; a bounded listing preserves it.
        store.s3().list_objects_v2(Bucket=store.BUCKET, Prefix=".sportsbuilder/setup/", MaxKeys=1)
    except (BotoCoreError, ClientError, KeyError, ValueError, RuntimeError) as error:
        print(f"SPORTSBUILDER_STORAGE_ERROR: {failure_message(error)}", flush=True)
        traceback.print_exc(file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
