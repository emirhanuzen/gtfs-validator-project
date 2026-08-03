import os 
import pandas as pd

REQUIRED_COLUMNS = {
    "agency.txt": ["agency_name", "agency_url", "agency_timezone"],
    "stops.txt": ["stop_id", "stop_name", "stop_lat", "stop_lon"],
    "routes.txt": ["route_id", "route_short_name", "route_type"],
    "trips.txt": ["trip_id", "route_id", "service_id"],
    "stop_times.txt": ["trip_id", "stop_id", "stop_sequence"],
}

REQUIRED_FILES = ["agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt"]

def validate_gtfs_files(extracted_path:str):
    missing=[]
    for filename in REQUIRED_FILES:
        file_path=os.path.join(extracted_path,filename)
        if not os.path.exists(file_path):
            missing.append(filename)

    if missing:
        raise ValueError (f"Eksik GTFS dosyaları:{', '.join(missing)}")  

def validate_columns(extracted_path):
    for filename ,required_cols in REQUIRED_COLUMNS.items():
        file_path=os.path.join(extracted_path,filename)
        df=pd.read_csv(file_path)  

        missing_cols=[col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"{filename} dosyasında eksik kolonlar:{', '.join(missing_cols)}")

def validate_references(extracted_path):
    agency_df=pd.read_csv(os.path.join(extracted_path,"agency.txt"))
    trips_df=pd.read_csv(os.path.join(extracted_path,"trips.txt"))
    routes_df=pd.read_csv(os.path.join(extracted_path,"routes.txt"))
    stop_times_df=pd.read_csv(os.path.join(extracted_path,"stop_times.txt"))
    stops_df=pd.read_csv(os.path.join(extracted_path,"stops.txt"))

    invalid_routes=trips_df[~trips_df["route_id"].isin(routes_df["route_id"])]
    if len(invalid_routes)>0:
        raise ValueError(f"trips.txt içinde geçersiz route_id referansı:{len(invalid_routes)} satır")

    invalid_trips=stop_times_df[~stop_times_df["trip_id"].isin(trips_df["trip_id"])]
    if len(invalid_trips)>0:
        raise ValueError(f"stop_times.txt içinde geçersiz trip_id referansı:{len(invalid_trips)} satır")

    invalid_stops=stop_times_df[~stop_times_df["stop_id"].isin(stops_df["stop_id"])]
    if len(invalid_stops)>0:
        raise ValueError(f"stop_times.txt içinde geçersiz stop_id referansı:{len(invalid_stops)} satır")

def validate_stop_sequences(extracted_path):
    stop_times_df=pd.read_csv(os.path.join(extracted_path,"stop_times.txt"))
    duplicates=stop_times_df[stop_times_df.duplicated(subset=["trip_id","stop_sequence"],keep=False)]
    if len(duplicates)>0:
        problem_trips=duplicates["trip_id"].unique()
        raise ValueError(f"stop_times.txt içinde tekrarlanan stop_sequence: {len(problem_trips)} trip'te sorun var")