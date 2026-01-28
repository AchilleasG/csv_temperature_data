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


def test_analytics_summary(tmp_path) -> None:
    csv_path = tmp_path / "data.csv"
    csv_path.write_text(
        "Station Number;Year;Jan;Feb\n"
        "123;2000;1.0;3.0\n"
        "123;2001;5.0;7.0\n"
        "456;2000;100.0;200.0\n",
        encoding="utf-8",
    )

    from csv_temperature_data.core.config import settings

    settings.csv_path = str(csv_path)
    client = TestClient(app)
    resp = client.get("/api/analytics/summary?stations=123&start_year=2000&end_year=2001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 4
    assert data["min"] == 1.0
    assert data["max"] == 7.0
    assert data["mean"] == 4.0


def test_analytics_summary_missing_station_404(tmp_path) -> None:
    csv_path = tmp_path / "data.csv"
    csv_path.write_text(
        "Station Number;Year;Jan\n"
        "123;2000;1.0\n",
        encoding="utf-8",
    )

    from csv_temperature_data.core.config import settings

    settings.csv_path = str(csv_path)
    client = TestClient(app)
    resp = client.get("/api/analytics/summary?stations=999")
    assert resp.status_code == 404
    assert resp.json() == {"detail": {"missing_stations": ["999"]}}


def test_monthly_data(tmp_path) -> None:
    csv_path = tmp_path / "data.csv"
    csv_path.write_text(
        "Station Number;Year;Jan;Feb\n"
        "123;2000;1.0;3.0\n"
        "123;2001;5.0;7.0\n"
        "456;2000;100.0;200.0\n",
        encoding="utf-8",
    )

    from csv_temperature_data.core.config import settings

    settings.csv_path = str(csv_path)
    client = TestClient(app)
    resp = client.get("/api/data/monthly?stations=123&start_year=2000&end_year=2000")
    assert resp.status_code == 200
    assert resp.json() == {
        "stations": [
            {
                "station": "123",
                "points": [
                    {"year": 2000, "month": 1, "value": 1.0},
                    {"year": 2000, "month": 2, "value": 3.0},
                ],
            }
        ]
    }


def test_annual_data_with_std(tmp_path) -> None:
    csv_path = tmp_path / "data.csv"
    csv_path.write_text(
        "Station Number;Year;Jan;Feb\n"
        "123;2000;1.0;3.0\n",
        encoding="utf-8",
    )

    from csv_temperature_data.core.config import settings

    settings.csv_path = str(csv_path)
    client = TestClient(app)
    resp = client.get("/api/data/annual?stations=123&include_std=true")
    assert resp.status_code == 200
    assert resp.json() == {
        "stations": [
            {
                "station": "123",
                "points": [
                    {
                        "year": 2000,
                        "mean": 2.0,
                        "std": 1.0,
                        "lower": 1.0,
                        "upper": 3.0,
                    }
                ],
            }
        ]
    }


def test_annual_data_missing_station_404(tmp_path) -> None:
    csv_path = tmp_path / "data.csv"
    csv_path.write_text(
        "Station Number;Year;Jan\n"
        "123;2000;1.0\n",
        encoding="utf-8",
    )

    from csv_temperature_data.core.config import settings

    settings.csv_path = str(csv_path)
    client = TestClient(app)
    resp = client.get("/api/data/annual?stations=999&include_std=false")
    assert resp.status_code == 404
    assert resp.json() == {"detail": {"missing_stations": ["999"]}}
