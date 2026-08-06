import pytest
import os
from app.validation.gtfs_validator import (validate_dates,validate_field_values,validate_gtfs_files,validate_references,
    validate_columns, validate_stop_sequences, validate_unique_ids,
    validate_service_references, validate_times
)

def test_validate_dates_with_invalid_date(tmp_path):
    calendar_content="service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
    calendar_content+="WEEKDAY,1,1,1,1,1,0,0,20261332,20261231\n"

    calendar_file=tmp_path / "calendar.txt"
    calendar_file.write_text(calendar_content)

    with pytest.raises(ValueError):
        validate_dates(str(tmp_path))

def test_validate_with_valid_date(tmp_path):
    calendar_content = "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
    calendar_content += "WEEKDAY,1,1,1,1,1,0,0,20260101,20261231\n"

    calendar_file=tmp_path / "calendar.txt"
    calendar_file.write_text(calendar_content)

    validate_dates(str(tmp_path))

##########
def test_validate_field_values_with_invalid_coordinates(tmp_path):
    stops_content="stop_id,stop_name,stop_lat,stop_lon\n" 
    stops_content+="STOP1,Kizilay,950.0,32.85\n"

    stops_file=tmp_path / "stops.txt"
    stops_file.write_text(stops_content)

    with pytest.raises(ValueError):
        validate_field_values(str(tmp_path))

def test_validate_field_values_with_valid_coordinates(tmp_path):
    stops_content="stop_id,stop_name,stop_lat,stop_lon\n" 
    stops_content+="STOP1,Kizilay,39.92,32.85\n"

    stops_file=tmp_path / "stops.txt"
    stops_file.write_text(stops_content)
    validate_field_values(str(tmp_path))

 #####

def test_validate_gtfs_files_with_missing_file(tmp_path):
    stops_file=tmp_path /stops_file
    stops_file.write_text("stop_id,stop_name,stop_lat,stop_lon\nSTOP1,Kizilay,39.92,32.85\n")

    with pytest.raises(ValueError):
        validate_gtfs_files(str(tmp_path))

def test_validate_gtfs_files_with_all_files_present(tmp_path):
    (tmp_path / "agency.txt").write_text(
        "agency_name,agency_url,agency_timezone\nTest Agency,http://test.com,Europe/Istanbul\n"
    )
    (tmp_path / "stops.txt").write_text(
        "stop_id,stop_name,stop_lat,stop_lon\nS1,Kizilay,39.92,32.85\n"
    )
    (tmp_path / "routes.txt").write_text(
        "route_id,route_short_name,route_type\nR1,15A,3\n"
    )
    (tmp_path / "trips.txt").write_text(
        "trip_id,route_id,service_id\nT1,R1,WEEKDAY\n"
    )
    (tmp_path / "stop_times.txt").write_text(
        "trip_id,stop_id,stop_sequence,arrival_time,departure_time\nT1,S1,1,08:00:00,08:00:00\n"
    )
    (tmp_path / "calendar.txt").write_text(
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nWEEKDAY,1,1,1,1,1,0,0,20260101,20261231\n"
    )

    validate_gtfs_files(str(tmp_path))

#######
def test_validate_references_with_invalid_route_id(tmp_path):
      agency_content = "agency_name,agency_url,agency_timezone\nTest Agency,http://test.com,Europe/Istanbul\n"
      (tmp_path/"agency.txt").write_text(agency_content)

      routes_content = "route_id,route_short_name,route_type\nR1,15A,3\n"
      (tmp_path / "routes.txt").write_text(routes_content)

      stops_content = "stop_id,stop_name,stop_lat,stop_lon\nS1,Kizilay,39.92,32.85\n"
      (tmp_path / "stops.txt").write_text(stops_content)

      trips_content = "trip_id,route_id,service_id\nT1,GECERSIZ_ROUTE,WEEKDAY\n"
      (tmp_path / "trips.txt").write_text(trips_content)

      stop_times_content = "trip_id,stop_id,stop_sequence,arrival_time,departure_time\nT1,S1,1,08:00:00,08:00:00\n"
      (tmp_path / "stop_times.txt").write_text(stop_times_content)

      with pytest.raises(ValueError):
          validate_references(str(tmp_path))

def test_validate_references_with_valid_route_id(tmp_path):
    agency_content = "agency_name,agency_url,agency_timezone\nTest Agency,http://test.com,Europe/Istanbul\n"
    (tmp_path / "agency.txt").write_text(agency_content)

    routes_content = "route_id,route_short_name,route_type\nR1,15A,3\n"
    (tmp_path / "routes.txt").write_text(routes_content)

    stops_content = "stop_id,stop_name,stop_lat,stop_lon\nS1,Kizilay,39.92,32.85\n"
    (tmp_path / "stops.txt").write_text(stops_content)

    trips_content = "trip_id,route_id,service_id\nT1,R1,WEEKDAY\n"
    (tmp_path / "trips.txt").write_text(trips_content)

    stop_times_content = "trip_id,stop_id,stop_sequence,arrival_time,departure_time\nT1,S1,1,08:00:00,08:00:00\n"
    (tmp_path / "stop_times.txt").write_text(stop_times_content)

    validate_references(str(tmp_path))
from app.validation.gtfs_validator import (
    validate_columns, validate_stop_sequences, validate_unique_ids,
    validate_service_references, validate_times
)

#####

def test_validate_columns_with_missing_column(tmp_path):
    (tmp_path / "stops.txt").write_text("stop_id,stop_name\nS1,Kizilay\n")  # stop_lat/stop_lon eksik
    with pytest.raises(ValueError):
        validate_columns(str(tmp_path))

def test_validate_columns_with_all_columns(tmp_path):
    (tmp_path / "stops.txt").write_text("stop_id,stop_name,stop_lat,stop_lon\nS1,Kizilay,39.92,32.85\n")
    (tmp_path / "agency.txt").write_text("agency_name,agency_url,agency_timezone\nA,http://a.com,Europe/Istanbul\n")
    (tmp_path / "routes.txt").write_text("route_id,route_short_name,route_type\nR1,15A,3\n")
    (tmp_path / "trips.txt").write_text("trip_id,route_id,service_id\nT1,R1,WEEKDAY\n")
    (tmp_path / "stop_times.txt").write_text("trip_id,stop_id,stop_sequence\nT1,S1,1\n")
    validate_columns(str(tmp_path))


# --- validate_stop_sequences ---

def test_validate_stop_sequences_with_duplicate(tmp_path):
    content = "trip_id,stop_id,stop_sequence,arrival_time,departure_time\n"
    content += "T1,S1,1,08:00:00,08:00:00\n"
    content += "T1,S2,1,08:05:00,08:05:00\n"  # aynı trip'te sequence tekrarı
    (tmp_path / "stop_times.txt").write_text(content)
    with pytest.raises(ValueError):
        validate_stop_sequences(str(tmp_path))

def test_validate_stop_sequences_without_duplicate(tmp_path):
    content = "trip_id,stop_id,stop_sequence,arrival_time,departure_time\n"
    content += "T1,S1,1,08:00:00,08:00:00\n"
    content += "T1,S2,2,08:05:00,08:05:00\n"
    (tmp_path / "stop_times.txt").write_text(content)
    validate_stop_sequences(str(tmp_path))


# --- validate_unique_ids ---

def test_validate_unique_ids_with_duplicate_stop_id(tmp_path):
    content = "stop_id,stop_name,stop_lat,stop_lon\n"
    content += "S1,Kizilay,39.92,32.85\n"
    content += "S1,Ulus,39.94,32.86\n"  # aynı stop_id tekrar
    (tmp_path / "stops.txt").write_text(content)
    (tmp_path / "routes.txt").write_text("route_id,route_short_name,route_type\nR1,15A,3\n")
    (tmp_path / "trips.txt").write_text("trip_id,route_id,service_id\nT1,R1,WEEKDAY\n")
    with pytest.raises(ValueError):
        validate_unique_ids(str(tmp_path))

def test_validate_unique_ids_without_duplicate(tmp_path):
    (tmp_path / "stops.txt").write_text("stop_id,stop_name,stop_lat,stop_lon\nS1,Kizilay,39.92,32.85\n")
    (tmp_path / "routes.txt").write_text("route_id,route_short_name,route_type\nR1,15A,3\n")
    (tmp_path / "trips.txt").write_text("trip_id,route_id,service_id\nT1,R1,WEEKDAY\n")
    validate_unique_ids(str(tmp_path))


# --- validate_service_references ---

def test_validate_service_references_with_invalid_service(tmp_path):
    (tmp_path / "trips.txt").write_text("trip_id,route_id,service_id\nT1,R1,HAYALET\n")
    (tmp_path / "calendar.txt").write_text(
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
        "WEEKDAY,1,1,1,1,1,0,0,20260101,20261231\n"
    )
    with pytest.raises(ValueError):
        validate_service_references(str(tmp_path))

def test_validate_service_references_with_valid_service(tmp_path):
    (tmp_path / "trips.txt").write_text("trip_id,route_id,service_id\nT1,R1,WEEKDAY\n")
    (tmp_path / "calendar.txt").write_text(
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
        "WEEKDAY,1,1,1,1,1,0,0,20260101,20261231\n"
    )
    validate_service_references(str(tmp_path))


# --- validate_times ---

def test_validate_times_with_invalid_format(tmp_path):
    content = "trip_id,stop_id,stop_sequence,arrival_time,departure_time\n"
    content += "T1,S1,1,8-00-00,8-00-00\n"  # yanlış ayraç
    (tmp_path / "stop_times.txt").write_text(content)
    with pytest.raises(ValueError):
        validate_times(str(tmp_path))

def test_validate_times_with_valid_format(tmp_path):
    content = "trip_id,stop_id,stop_sequence,arrival_time,departure_time\n"
    content += "T1,S1,1,08:00:00,08:00:00\n"
    (tmp_path / "stop_times.txt").write_text(content)
    validate_times(str(tmp_path))


        

      

















