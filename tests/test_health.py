from fastapi.testclient import TestClient

from csv_temperature_data.main import app


def test_healthcheck() -> None:
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_list_stations_unique(tmp_path) -> None:
    csv_path = tmp_path / "data.csv"
    csv_path.write_text(
        "Station Number;Year;Jan\n"
        "123;2000;1.0\n"
        "123;2001;2.0\n"
        "456;2000;3.0\n",
        encoding="utf-8",
    )

    from csv_temperature_data.core.config import settings

    settings.csv_path = str(csv_path)
    client = TestClient(app)
    resp = client.get("/api/stations")
    assert resp.status_code == 200
    assert resp.json() == {"count": 2, "stations": ["123", "456"]}
