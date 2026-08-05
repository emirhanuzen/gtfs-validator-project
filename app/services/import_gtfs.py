from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.import_gtfs  import ImportGtfs
from app.models.route import Route
from app.models.stop import Stop
from app.models.stop_time import StopTime
from app.models.trip import  Trip
from app.models.agency import  Agency

def create_import(file_name:str,file_path:str,db:Session):
    try:
        db_import=ImportGtfs(file_name=file_name,file_path=file_path)
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


def get_stop_time(import_id:int,db:Session):
     db_stop_time=db.query(StopTime).filter(StopTime.import_id==import_id).all()
     if not db_stop_time:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_stop_time


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