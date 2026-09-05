from __future__ import annotations

from pathlib import Path

from src.io_utils import read_json


ROOT = Path(__file__).resolve().parents[1]


def test_project_has_small_complete_workflow() -> None:
    project = read_json(ROOT / "project" / "project-config.yml")
    assert project["statuses"] == ["Backlog", "Ready", "In Progress", "Blocked", "Review", "Done"]
    assert {field["name"] for field in project["fields"]} >= {"Owning Team", "Source System", "Release Gate"}


def test_seed_tickets_use_ticket_language_and_valid_teams() -> None:
    project = read_json(ROOT / "project" / "project-config.yml")
    seed = read_json(ROOT / "project" / "seed-tickets.yml")
    teams = set(next(field for field in project["fields"] if field["name"] == "Owning Team")["options"])

    assert len(seed["tickets"]) == 5
    assert len(seed["huddle_created_tickets"]) == 7
    assert all("devops" not in ticket["title"].lower() for ticket in seed["tickets"] + seed["huddle_created_tickets"])
    assert all(ticket["owning_team"] in teams for ticket in seed["tickets"] + seed["huddle_created_tickets"])
