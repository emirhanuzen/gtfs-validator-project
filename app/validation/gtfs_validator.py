import os 
import pandas as pd
import re

REQUIRED_COLUMNS = {
    "agency.txt": ["agency_name", "agency_url", "agency_timezone"],
    "stops.txt": ["stop_id", "stop_name", "stop_lat", "stop_lon"],
    "routes.txt": ["route_id", "route_short_name", "route_type"],
    "trips.txt": ["trip_id", "route_id", "service_id"],
    "stop_times.txt": ["trip_id", "stop_id", "stop_sequence"],
}

OPTIONAL_FILES = ["shapes.txt", "transfers.txt"]

REQUIRED_FILES = ["agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt"]

TIME_PATTERN = re.compile(r"^\d{1,2}:\d{2}:\d{2}$")


def validate_gtfs_files(extracted_path:str):
    missing=[]
    for filename in REQUIRED_FILES:
        file_path=os.path.join(extracted_path,filename)
        if not os.path.exists(file_path):
            missing.append(filename)

    if missing:
        raise ValueError (f"Eksik GTFS dosyaları:{', '.join(missing)}")  

def check_optional_files(extracted_path):
    wornings=[]
    for filename in OPTIONAL_FILES:
        file_path=os.path.join(extracted_path,filename)
        if not os.path.exists(file_path):
            wornings.append(f"{filename} bulunamadı")
    return wornings

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
        problem_route_ids=invalid_routes["trip_id"].tolist()
        raise ValueError(f"trips.txt içinde geçersiz route_id referansı:{problem_route_ids} ")

    invalid_trips=stop_times_df[~stop_times_df["trip_id"].isin(trips_df["trip_id"])]
    if len(invalid_trips)>0:
        problem_trips_id=invalid_trips["trip_id"].tolist()
        raise ValueError(f"stop_times.txt içinde geçersiz trip_id referansı:{problem_trips_id} ")

    invalid_stops=stop_times_df[~stop_times_df["stop_id"].isin(stops_df["stop_id"])]
    if len(invalid_stops)>0:
        problem_stop_id=invalid_stops["stop_id"].tolist()
        raise ValueError(f"stop_times.txt içinde geçersiz stop_id referansı:{problem_stop_id} ")

def validate_stop_sequences(extracted_path):
    stop_times_df=pd.read_csv(os.path.join(extracted_path,"stop_times.txt"))
    duplicates=stop_times_df[stop_times_df.duplicated(subset=["trip_id","stop_sequence"],keep=False)]
    if len(duplicates)>0:
        problem_trips=duplicates["trip_id"].unique().tolist()
        raise ValueError(f"stop_times.txt içinde tekrarlanan stop_sequence: {problem_trips} trip'te sorun var")

def validate_field_values(extracted_path):
        stops_df=pd.read_csv(os.path.join(extracted_path,"stops.txt"))

        invalid_lat=stops_df[(stops_df["stop_lat"]<-90) | (stops_df["stop_lat"]>90)]
        if len(invalid_lat)>0:
            problem_lat=invalid_lat["stop_lat"].tolist()
            raise ValueError(f"stops.txt içinde geçersiz stop_lat değeri: {problem_lat} ")

        invalid_lon=stops_df[(stops_df["stop_lon"]<-180) |(stops_df["stop_lon"]>180)]
        if len(invalid_lon)>0:
            problem_lon=invalid_lon["stop_lon"].tolist()
            raise ValueError(f"stops.txt içinde geçersiz stop_lon değeri: {problem_lon} ")    

def validate_unique_ids(extracted_path):
    checks = {
        "stops.txt": "stop_id",
        "routes.txt": "route_id",
        "trips.txt": "trip_id",
    }
    for filename ,id_column in checks.items():
        df=pd.read_csv(os.path.join(extracted_path,filename))
        duplicated_ids=df[df.duplicated(subset=[id_column],keep=False)][id_column].unique().tolist()
        if duplicated_ids:
            raise ValueError(f"{filename} içinde tekrarlanan {id_column}:{duplicated_ids}") 


def validate_service_references(extracted_path):
    trips_df=pd.read_csv(os.path.join(extracted_path,"trips.txt"))

    valid_service_ids=set()

    calendar_path=os.path.join(extracted_path,"calendar.txt")
    if os.path.exists(calendar_path):
        calendar_df=pd.read_csv(calendar_path)
        valid_service_ids.update(calendar_df["service_id"].tolist())

    calendar_dates_path=os.path.join(extracted_path,"calendar_dates.txt")
    if os.path.exists(calendar_dates_path):
        calendar_dates_df=pd.read_csv(calendar_dates_path)
        valid_service_ids.update(calendar_dates_df["service_id"].tolist())

    invalid_services=trips_df[~trips_df["service_id"].isin(valid_service_ids)]
    if len(invalid_services)>0:
        problem_ids=invalid_services["service_id"].unique().tolist()
        raise ValueError(f"trips.txt içinde geçersiz service_id referansı:{problem_ids}")


def validate_dates(extracted_path):
    calender_path=os.path.join(extracted_path,"calendar.txt")
    if not os.path.exists(calender_path):
        return

    calender_df=pd.read_csv(calender_path,dtype={"start_date":str,"end_date":str})

    for col in ["start_date","end_date"]:
        invalid_dates=calender_df[pd.to_datetime(calender_df[col],format="%Y%m%d", errors="coerce").isna()]

        if len(invalid_dates)>0:
            problem_dates=invalid_dates[["start_date","end_date"]]
            raise ValueError(f"calendar.txt içinde geçersiz {col}: {problem_dates.to_dict('records')}")

def parse_time_parts(time_str):
    hours,minutes,seconds=time_str.split(":")
    return int(hours),int(minutes),int(seconds)

def validate_times(extracted_path):
    stop_times_df=pd.read_csv(os.path.join(extracted_path,"stop_times.txt"),dtype=str)

    for col in ["arrival_time","departure_time"]:
        invalid_times=stop_times_df[~stop_times_df[col].str.match(TIME_PATTERN,na=False)]
        if len(invalid_times)>0:
            problem_times=invalid_times[["arrival_time","departure_time"]]
            raise ValueError(f"Geçersiz varış ve kalkış zamanı:{problem_times.to_dict('records')}")

        valid_format_df=stop_times_df[stop_times_df[col].str.match(TIME_PATTERN,na=False)]
        bad_rows=[]
        for time_str in valid_format_df[col]:
            h,m,s=parse_time_parts(time_str)
            if h>48 or m>59 or s>59:
                bad_rows.append(time_str)
        if bad_rows:
            raise ValueError(f"stop_times.txt içinde mantıksız {col} değeri: {bad_rows}")


def check_data_quality_warnings(extracted_path):
    warnings=[]
    stops_df=pd.read_csv(os.path.join(extracted_path,"stops.txt"),dtype={"stop_name":str})
    empty_names=stops_df[stops_df["stop_name"].isna() | (stops_df["stop_name"].str.strip()=="")]
    if len(empty_names)>0:
        warnings.append(f"{len(empty_names)} durakta stop_name boş")      
        
    routes_df=pd.read_csv(os.path.join(extracted_path,"routes.txt"),dtype={"route_short_name":str})    
    empty_route_names=routes_df[routes_df["route_short_name"].isna() | (routes_df["route_short_name"].str.strip()=="")]
    if len(empty_route_names)>0:
        warnings.append(f"{len(empty_route_names)} seferde route_short_name boş")
    return warnings


def gtfs_validate_all(extracted_path):
    validate_gtfs_files(extracted_path)
    validate_columns(extracted_path)
    validate_references(extracted_path)
    validate_stop_sequences(extracted_path)
    validate_field_values(extracted_path)
    validate_unique_ids(extracted_path)
    validate_service_references(extracted_path)
    validate_dates(extracted_path)
    validate_times(extracted_path)