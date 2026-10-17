"""Wire serialization must preserve the complete tool and profile contracts."""

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from server import store
from server.app import app

TOOL = {
    "id": "00000000-0000-4000-8000-000000000001",
    "createdAt": "2026-10-17T12:00:00Z",
    "format": 1,
    "name": "Push-up control",
    "sport": "Strength",
    "audience": "Beginners",
    "description": "Controlled movement",
    "rubric": "Observe the elbow angle.",
    "coachPrompt": "Use actual visible evidence.",
    "focusJoint": "left_elbow",
    "metrics": [
        {
            "id": "angle",
            "name": "Elbow angle",
            "description": "Projected elbow angle",
            "scope": "frame",
            "unit": "angle",
            "formula": {
                "op": "angle",
                "args": [
                    {"op": "point", "joint": "left_shoulder"},
                    {"op": "point", "joint": "left_elbow"},
                    {"op": "point", "joint": "left_wrist"},
                ],
            },
            "target": {"min": 30, "max": 170, "message": "Look for controlled range."},
        }
    ],
}
PROFILE = {
    "id": "00000000-0000-4000-8000-000000000002",
    "name": "Athlete",
    "heightCm": 180,
    "weightKg": 72,
    "dominantSide": "Right",
    "experience": "Beginner",
    "notes": "A note",
}


def test_home_preserves_full_saved_config_and_profile(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        store,
        "records",
        lambda kind: deepcopy({"profiles": [PROFILE], "tools": [TOOL], "sessions": []}[kind]),
    )
    # No lifespan context: this serialization test never opens a database connection.
    response = TestClient(app).get("/api/home")
    assert response.status_code == 200
    assert response.json()["tools"] == [TOOL]
    assert response.json()["profiles"] == [PROFILE]


def test_saved_tool_response_retains_formula_rubric_and_coach(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("AGENT_INTERNAL_SECRET", "test-only-secret")
    monkeypatch.setattr(store, "save", lambda kind, value: value)
    body = {key: value for key, value in TOOL.items() if key not in ["id", "createdAt"]}
    response = TestClient(app).post(
        "/api/tools", json=body, headers={"x-agent-secret": "test-only-secret"}
    )
    assert response.status_code == 200
    for key, value in body.items():
        assert response.json()[key] == value


def test_profile_response_retains_measurements(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(store, "save", lambda kind, value: value)
    body = {key: value for key, value in PROFILE.items() if key != "id"}
    response = TestClient(app).post("/api/profiles", json=body)
    assert response.status_code == 200
    for key, value in body.items():
        assert response.json()[key] == value


def test_height_patch_preserves_identity_and_other_profile_fields(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(PROFILE))
    monkeypatch.setattr(store, "records", lambda kind: [])
    monkeypatch.setattr(
        store, "patch", lambda kind, identifier, changes: {**deepcopy(PROFILE), **changes}
    )
    response = TestClient(app).patch(f"/api/profiles/{PROFILE['id']}", json={"heightCm": 178})
    assert response.status_code == 200
    assert response.json() == {**PROFILE, "heightCm": 178}


@pytest.mark.parametrize("height", [None, 29, 301])
def test_height_patch_rejects_missing_or_out_of_range_measurement(
    monkeypatch: pytest.MonkeyPatch, height: float | None
):
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(PROFILE))
    response = TestClient(app).patch(f"/api/profiles/{PROFILE['id']}", json={"heightCm": height})
    assert response.status_code == 422


def test_preview_redirect_uses_private_object_without_analysis(monkeypatch: pytest.MonkeyPatch):
    session = {"id": PROFILE["id"], "previewKey": "previews/first.jpg"}
    monkeypatch.setattr(store, "get", lambda kind, identifier: session)
    monkeypatch.setattr(store, "url", lambda key: "https://private.example/" + key + "?signed=yes")
    response = TestClient(app).get(f"/api/sessions/{PROFILE['id']}/preview", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "https://private.example/previews/first.jpg?signed=yes"


def test_preview_missing_returns_placeholder_compatible_not_found(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(store, "get", lambda kind, identifier: {"id": PROFILE["id"]})
    assert TestClient(app).get(f"/api/sessions/{PROFILE['id']}/preview").status_code == 404


def test_height_edit_rescales_saved_stature_but_preserves_known_distance(
    monkeypatch: pytest.MonkeyPatch,
):
    old = {
        "metersPerPixel": 0.0045,
        "ground": 940,
        "source": "athlete_height_manual",
        "heightCm": 180,
        "bodyHeightPixels": 400,
        "frameTime": 1.2,
    }
    sessions = [
        {"id": "height", "profileId": PROFILE["id"], "status": "complete", "calibration": old},
        {
            "id": "distance",
            "profileId": PROFILE["id"],
            "status": "complete",
            "calibration": {"metersPerPixel": 0.003, "ground": 940, "source": "known_distance"},
        },
    ]
    saved = []
    monkeypatch.setattr(store, "get", lambda kind, identifier: deepcopy(PROFILE))
    monkeypatch.setattr(store, "patch", lambda kind, identifier, changes: {**PROFILE, **changes})
    monkeypatch.setattr(store, "records", lambda kind: deepcopy(sessions))
    monkeypatch.setattr(
        store,
        "save_height_calibration",
        lambda identifier, changed, expected: saved.append((identifier, changed, expected)),
    )
    response = TestClient(app).patch(f"/api/profiles/{PROFILE['id']}", json={"heightCm": 178})
    assert response.status_code == 200
    assert len(saved) == 1
    assert saved[0][0] == "height"
    assert saved[0][1]["metersPerPixel"] == pytest.approx(0.00445)
    assert saved[0][2] == old


def test_session_patch_roundtrips_height_provenance(monkeypatch: pytest.MonkeyPatch):
    session = {"id": PROFILE["id"], "duration": 10, "status": "complete"}
    monkeypatch.setattr(store, "get", lambda kind, identifier: session)
    monkeypatch.setattr(store, "patch", lambda kind, identifier, changes: {**session, **changes})
    metadata = {
        "metersPerPixel": 0.00445,
        "ground": 940,
        "source": "athlete_height_manual",
        "heightCm": 178,
        "bodyHeightPixels": 400,
        "frameTime": 1.2,
    }
    response = TestClient(app).patch(
        f"/api/sessions/{PROFILE['id']}", json={"calibration": metadata}
    )
    assert response.status_code == 200
    assert response.json()["calibration"] == metadata


@pytest.mark.parametrize("interval", [0.05, 2])
def test_upload_accepts_sampling_range_endpoints(monkeypatch: pytest.MonkeyPatch, interval: float):
    from server import vision
    from server.types import VideoInfo

    monkeypatch.setattr(store, "get", lambda kind, identifier: {"id": identifier})
    monkeypatch.setattr(store, "put", lambda key, body, content_type: None)
    monkeypatch.setattr(store, "save", lambda kind, value: value)
    monkeypatch.setattr(vision, "inspect_video", lambda path: VideoInfo(30, 90, 640, 360, 3))
    monkeypatch.setattr(vision, "first_frame_preview", lambda path: b"jpeg")
    response = TestClient(app).post(
        "/api/upload",
        files={"file": ("clip.mp4", b"video", "video/mp4")},
        data={
            "profileId": str(PROFILE["id"]),
            "toolId": str(TOOL["id"]),
            "interval": str(interval),
        },
    )
    assert response.status_code == 200
    assert response.json()["interval"] == interval


@pytest.mark.parametrize("interval", [0.033, 0.049, 2.001, "nan", "inf"])
def test_upload_rejects_out_of_range_or_nonfinite_sampling_interval(interval: float | str):
    response = TestClient(app).post(
        "/api/upload",
        files={"file": ("clip.mp4", b"video", "video/mp4")},
        data={"interval": str(interval)},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Use a sampling interval between 0.05 and 2 seconds."


@pytest.mark.parametrize("premade", [False, True])
def test_remove_coach_keeps_full_record_and_historical_lookup(
    monkeypatch: pytest.MonkeyPatch, premade: bool
):
    original = deepcopy(store.PREMADE_COACHES[0] if premade else TOOL)
    saved = {}
    monkeypatch.setattr(
        store,
        "get",
        lambda kind, key: deepcopy(saved.get(key, original)) if key == original["id"] else None,
    )

    def save(kind, value):
        saved[value["id"]] = deepcopy(value)
        return value

    monkeypatch.setattr(store, "save", save)
    monkeypatch.setattr(
        store, "records", lambda kind: list(saved.values()) if kind == "tools" else []
    )
    client = TestClient(app)
    response = client.delete(f"/api/tools/{original['id']}")
    assert response.status_code == 200
    assert response.json() == {**original, "hidden": True}
    assert store.get("tools", str(original["id"])) == response.json()
    assert client.get("/api/home").json()["tools"] == [response.json()]
    assert client.delete(f"/api/tools/{original['id']}").json() == response.json()
    assert client.delete("/api/tools/not-a-uuid").status_code == 404
