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
