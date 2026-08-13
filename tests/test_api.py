from fastapi.testclient import TestClient
from app.main import app
from app.tasks.celery_app import celery_app  
import time

# SADECE TESTLERDE GEÇERLİ OLACAK AYAR:
celery_app.conf.update(
    task_always_eager=True,
    task_eager_propagates=True
)

client = TestClient(app)


def test_list_imports_returns_200():
    response=client.get("/import_gtfs/")
    assert response.status_code==200

def test_upload_invalid_file_extension_returns_400():
     fake_file = ("test.txt", b"bu bir zip degil", "text/plain")    
     response=client.post("/import_gtfs/",files={"file":fake_file})
     assert response.status_code==400

def test_get_nonexistent_import_returns_404():
     response=client.get("/import_gtfs/9999999")
     assert response.status_code==404

def test_list_routes_returns_200():
    upload_response = client.post(
        "/import_gtfs/",
        files={"file": ("test.zip", open("samples/GTFS_CCRTA.zip", "rb"), "application/zip")}
    )
    import_id = upload_response.json()["id"]

    response = client.get(f"/import_gtfs/{import_id}/routes")
    assert response.status_code == 200


def test_list_stops_returns_200():
    upload_response = client.post(
        "/import_gtfs/",
        files={"file": ("test.zip", open("samples/GTFS_CCRTA.zip", "rb"), "application/zip")}
    )
    import_id = upload_response.json()["id"]

    response = client.get(f"/import_gtfs/{import_id}/stops")
    assert response.status_code == 200  


def test_list_trips_returns_200():
    upload_response = client.post(
        "/import_gtfs/",
        files={"file": ("test.zip", open("samples/GTFS_CCRTA.zip", "rb"), "application/zip")}
    )
    import_id = upload_response.json()["id"]

    response = client.get(f"/import_gtfs/{import_id}/trips")
    assert response.status_code == 200


def test_list_stop_times_returns_200():
    upload_response = client.post(
        "/import_gtfs/",
        files={"file": ("test.zip", open("samples/GTFS_CCRTA.zip", "rb"), "application/zip")}
    )
    import_id = upload_response.json()["id"]

    response = client.get(f"/import_gtfs/{import_id}/stop_times")
    assert response.status_code == 200


def test_list_agency_returns_200():
    upload_response = client.post(
        "/import_gtfs/",
        files={"file": ("test.zip", open("samples/GTFS_CCRTA.zip", "rb"), "application/zip")}
    )
    import_id = upload_response.json()["id"]

    response = client.get(f"/import_gtfs/{import_id}/agency")
    assert response.status_code == 200

def test_upload_valid_zip_returns_id_and_status():
    response = client.post(
        "/import_gtfs/",
        files={"file": ("test.zip", open("samples/GTFS_CCRTA.zip", "rb"), "application/zip")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] in ["uploaded", "processing", "completed", "completed_with_warnings"]

def test_upload_valid_zip_eventually_completes():
    response = client.post(
        "/import_gtfs/",
        files={"file": ("test.zip", open("samples/GTFS_CCRTA.zip", "rb"), "application/zip")}
    )
    import_id = response.json()["id"]

    time.sleep(20)

    status_response = client.get(f"/import_gtfs/{import_id}")
    assert status_response.json()["status"] in ["completed", "completed_with_warnings"] 