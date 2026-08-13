import os
import zipfile
import tempfile
from sqlalchemy.orm import Session
from app.services.route import get_routes_as_dataframe
from app.services.stop import get_stops_as_dataframe
from app.services.trip import get_trips_as_dataframe
from app.services.stop_time import get_stop_times_as_dataframe
from app.services.agency import get_agency_as_dataframe


def export_gtfs_zip(import_id: int, db: Session):
    temp_dir = tempfile.mkdtemp()

    dataframes = {
        "agency.txt": get_agency_as_dataframe(import_id, db),
        "routes.txt": get_routes_as_dataframe(import_id, db),
        "stops.txt": get_stops_as_dataframe(import_id, db),
        "trips.txt": get_trips_as_dataframe(import_id, db),
        "stop_times.txt": get_stop_times_as_dataframe(import_id, db),
    }

    for filename, df in dataframes.items():
        csv_path = os.path.join(temp_dir, filename)
        df.to_csv(csv_path, index=False)

    zip_path = os.path.join(temp_dir, f"export_{import_id}.zip")
    with zipfile.ZipFile(zip_path, "w") as zip_ref:
        for filename in dataframes.keys():
            file_path = os.path.join(temp_dir, filename)
            zip_ref.write(file_path, arcname=filename)

    return zip_path
