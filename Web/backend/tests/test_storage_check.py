"""Installer diagnostics through the real S3 request boundary, without cloud calls."""

import boto3
import pytest
from botocore.exceptions import EndpointConnectionError, SSLError
from botocore.stub import Stubber

from server import storage_check, store


@pytest.mark.parametrize(
    ("code", "status", "expected"),
    [
        ("InvalidAccessKeyId", 403, "full Neon storage token_id"),
        ("SignatureDoesNotMatch", 403, "s3_secret_access_key"),
        ("AccessDenied", 403, "same Neon branch"),
        ("NoSuchBucket", 404, "private videos bucket"),
        ("ExpiredToken", 400, "expired or invalid"),
        ("SlowDown", 503, "temporarily unavailable"),
        ("unexpected-private-code", 418, "failed unexpectedly"),
    ],
)
def test_service_failure_reports_recovery_without_echoing_upstream_secrets(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    code: str,
    status: int,
    expected: str,
) -> None:
    client = boto3.client(
        "s3",
        endpoint_url="https://storage.invalid",
        aws_access_key_id="fixture",
        aws_secret_access_key="private-fixture-secret",
    )
    monkeypatch.setattr(store, "s3", lambda: client)
    with Stubber(client) as stub:
        stub.add_client_error(
            "list_objects_v2",
            service_error_code=code,
            service_message="private-fixture-secret",
            http_status_code=status,
            expected_params={"Bucket": "videos", "Prefix": ".sportsbuilder/setup/", "MaxKeys": 1},
        )
        assert storage_check.main() == 2
        stub.assert_no_pending_responses()
    output = capsys.readouterr()
    assert expected in output.out
    assert output.out.startswith("SPORTSBUILDER_STORAGE_ERROR: ")
    assert "private-fixture-secret" not in output.out
    assert "unexpected-private-code" not in output.out


def test_success_does_not_print_object_keys_or_write_objects(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    client = boto3.client(
        "s3",
        endpoint_url="https://storage.invalid",
        aws_access_key_id="fixture",
        aws_secret_access_key="private-fixture-secret",
    )
    monkeypatch.setattr(store, "s3", lambda: client)
    with Stubber(client) as stub:
        stub.add_response(
            "list_objects_v2",
            {"Contents": [{"Key": "private-object-key"}]},
            {"Bucket": "videos", "Prefix": ".sportsbuilder/setup/", "MaxKeys": 1},
        )
        assert storage_check.main() == 0
        stub.assert_no_pending_responses()
    output = capsys.readouterr()
    assert output.out == output.err == ""


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (EndpointConnectionError(endpoint_url="https://private-host.invalid"), "Could not connect"),
        (
            SSLError(
                endpoint_url="https://private-host.invalid", error=ValueError("private-detail")
            ),
            "certificate verification",
        ),
        (KeyError("private-fixture-secret"), "settings are missing or invalid"),
    ],
)
def test_connection_and_configuration_diagnostics_are_safe(error: Exception, expected: str) -> None:
    message = storage_check.failure_message(error)
    assert expected in message
    assert "private" not in message
