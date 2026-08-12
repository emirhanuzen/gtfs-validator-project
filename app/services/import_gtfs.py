from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.import_gtfs  import ImportGtfs
from app.models.route import Route
from app.models.stop import Stop
from app.models.stop_time import StopTime
from app.models.trip import  Trip
from app.models.agency import  Agency
import hashlib,time,json
from app.models.import_gtfs import ImportStatus
from app.db.database import SessionLocal
from app.schemas.stop import  StopUpdate
from app.schemas.route import  RouteUpdate
from app.schemas.trip import  TripUpdate

def create_import(file_name:str,file_path:str,db:Session):
     checksum=calculate_checksum(file_path)
     try:
        db_import=ImportGtfs(file_name=file_name,file_path=file_path,file_checksum=checksum)
        db.add(db_import)
        db.commit()
        db.refresh(db_import)
        return db_import
     except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,detail=f"Dosya yüklenmedi:{str(e)} ")

def get_import(file_id:int,db:Session):
    db_import=db.query(ImportGtfs).filter(ImportGtfs.id==file_id).first()
    if not db_import:
            raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
    return db_import

def get_import_all(db:Session):
     db_import=db.query(ImportGtfs).all()
     return db_import

def get_routes(import_id:int,db:Session):
     db_routes=db.query(Route).filter(Route.import_id==import_id).all()
     if not db_routes:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_routes

def get_stops(import_id:int,db:Session):
     db_stops=db.query(Stop).filter(Stop.import_id==import_id).all()
     if not db_stops:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_stops

def get_stop_times(import_id:int,db:Session,limit:int=100,offset:int=0):
     db_stop_times=db.query(StopTime).filter(StopTime.import_id==import_id).offset(offset).limit(limit).all()
     if not db_stop_times:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_stop_times

def get_trips(import_id:int,db:Session):
     db_trips=db.query(Trip).filter(Trip.import_id==import_id).all()
     if not db_trips:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_trips


def get_agency(import_id:int,db:Session):
     db_agency=db.query(Agency).filter(Agency.import_id==import_id).all()
     if not db_agency:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_agency

def calculate_checksum(file_path):
    sha256_hash = hashlib.sha256()

    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(4096)
            if not chunk:
                break
            sha256_hash.update(chunk)

    return sha256_hash.hexdigest()

#generator fonk
def event_stream(import_id: int):
    while True:
        db = SessionLocal()
        try:
            db_import = db.query(ImportGtfs).filter(ImportGtfs.id == import_id).first()

            if not db_import:
                yield f"data: {json.dumps({'error': 'kayıt bulunamadı'})}\n\n"
                break

            message = {"status": db_import.status.value, "error_message": db_import.error_message}
            yield f"data: {json.dumps(message)}\n\n"

            if db_import.status in [ImportStatus.COMPLETED, ImportStatus.COMPLETED_WITH_WARNINGS, ImportStatus.FAILED]:
                break
        finally:
            db.close()

        time.sleep(2)

def retry_import(import_id: int, db: Session):
    db_import = db.query(ImportGtfs).filter(ImportGtfs.id == import_id).first()
    if not db_import:
        raise HTTPException(status_code=404, detail="Import bulunamadı")
    if db_import.status != ImportStatus.FAILED:
        raise HTTPException(status_code=400, detail="Sadece başarısız (failed) import'lar tekrar çalıştırılabilir")
    db_import.status = ImportStatus.UPLOADED
    db_import.error_message = None
    db.commit()
    db.refresh(db_import)
    return db_import

def update_stop(stop_id: int, update_data: StopUpdate, db: Session):
    db_stop = db.query(Stop).filter(Stop.id == stop_id).first()

    if not db_stop:
        raise HTTPException(status_code=404, detail="Durak bulunamadı")

    if update_data.stop_name is not None:
        db_stop.stop_name = update_data.stop_name
    if update_data.stop_lat is not None:
        db_stop.stop_lat = update_data.stop_lat
    if update_data.stop_lon is not None:
        db_stop.stop_lon = update_data.stop_lon

    db.commit()
    db.refresh(db_stop)
    return db_stop

def delete_stop(stop_id: int, db: Session):
    db_stop = db.query(Stop).filter(Stop.id == stop_id).first()

    if not db_stop:
        raise HTTPException(status_code=404, detail="Durak bulunamadı")

    db.delete(db_stop)
    db.commit()
    return {"detail": f"Durak (id: {stop_id}) silindi"}


def update_route(route_id: int, update_data: RouteUpdate, db: Session):
    db_route = db.query(Route).filter(Route.id == route_id).first()

    if not db_route:
        raise HTTPException(status_code=404, detail="Hat bulunamadı")

    if update_data.route_short_name is not None:
        db_route.route_short_name = update_data.route_short_name
    if update_data.route_long_name is not None:
        db_route.route_long_name = update_data.route_long_name
    if update_data.route_type is not None:
        db_route.route_type = update_data.route_type

    db.commit()
    db.refresh(db_route)
    return db_route


def delete_route(route_id: int, db: Session):
    db_route = db.query(Route).filter(Route.id == route_id).first()

    if not db_route:
        raise HTTPException(status_code=404, detail="Hat bulunamadı")

    db.delete(db_route)
    db.commit()
    return {"detail": f"Hat (id: {route_id}) silindi"}



def update_trip(trip_id: int, update_data: TripUpdate, db: Session):
    db_trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if not db_trip:
        raise HTTPException(status_code=404, detail="Sefer bulunamadı")

    if update_data.route_id is not None:
        db_trip.route_id = update_data.route_id
    if update_data.service_id is not None:
        db_trip.service_id = update_data.service_id

    db.commit()
    db.refresh(db_trip)
    return db_trip


def delete_trip(trip_id: int, db: Session):
    db_trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if not db_trip:
        raise HTTPException(status_code=404, detail="Sefer bulunamadı")

    db.delete(db_trip)
    db.commit()
    return {"detail": f"Sefer (id: {trip_id}) silindi"}