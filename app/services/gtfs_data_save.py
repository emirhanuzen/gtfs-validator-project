from app.models.agency import Agency
from app.models.route import Route
from app.models.stop import Stop
from app.models.trip import Trip
from sqlalchemy.orm import Session
import pandas as pd
import os
from  app.services.gtfs_data_bulk_save import save_stop_times 

def save_agencies(import_id:int,extracted_path:str,db:Session):
    agency_df=pd.read_csv(os.path.join(extracted_path,"agency.txt"))

    agency_objects=[]
    for _,row in agency_df.iterrows():
        agency=Agency(import_id=import_id,
                agency_name=row["agency_name"],
                agency_url=row.get("agency_url"),
                agency_timezone=row.get("agency_timezone"),
                #rowu direk kullanırsak eğer keyerror verir get ile kullan.
        )
        agency_objects.append(agency)
    db.bulk_save_objects(agency_objects)
    db.commit()

def save_routes(import_id:int,extracted_path:str,db:Session):
    routes_df=pd.read_csv(os.path.join(extracted_path,"routes.txt"))

    routes_objects=[]
    for _,row in routes_df.iterrows():
        routes=Route(import_id=import_id,
            route_id=row["route_id"],
            route_short_name=row.get("route_short_name"),
            route_long_name=row.get("route_long_name"), 
            route_type=row.get("route_type")    )
        routes_objects.append(routes)
    db.bulk_save_objects(routes_objects)
    db.commit()

def save_stops(import_id:int,extracted_path:str,db:Session):
    stop_df=pd.read_csv(os.path.join(extracted_path,"stops.txt"))

    stops_objects=[]
    for _,row in stop_df.iterrows():
        stops=Stop(import_id=import_id,
            stop_id=row["stop_id"],
            stop_name=row.get("stop_name"),
            stop_lat=row.get("stop_lat"),
            stop_lon=row.get("stop_lon")
                   )
        stops_objects.append(stops)
    db.bulk_save_objects(stops_objects)
    db.commit()

def save_trips(import_id:int,extracted_path:str,db:Session):
    trips_df=pd.read_csv(os.path.join(extracted_path,"trips.txt"))
    trips_objects=[]
    for _,row in trips_df.iterrows():
        trips=Trip(import_id=import_id,
            trip_id=row["trip_id"],
            route_id=row["route_id"],
            service_id=row["service_id"]
                   )
        trips_objects.append(trips)
    db.bulk_save_objects(trips_objects)
    db.commit()
        

def save_all_gtfs_data(import_id:int,extracted_path:str,db:Session):
    save_agencies(import_id=import_id,extracted_path=extracted_path,db=db)
    save_routes(import_id=import_id,extracted_path=extracted_path,db=db)
    save_stops(import_id=import_id,extracted_path=extracted_path,db=db)
    save_trips(import_id=import_id,extracted_path=extracted_path,db=db)
    save_stop_times(import_id=import_id,extracted_path=extracted_path,db=db)

                