from app.models.stop import Stop   
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.schemas.stop import  StopUpdate
import pandas as pd

def update_stop(import_id: int, stop_id: int, update_data: StopUpdate, db: Session):
    db_stop = db.query(Stop).filter(
        Stop.id == stop_id,
        Stop.import_id == import_id
    ).first()

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


def delete_stop(import_id: int, stop_id: int, db: Session):
    db_stop = db.query(Stop).filter(
        Stop.id == stop_id,
        Stop.import_id == import_id
    ).first()

    if not db_stop:
        raise HTTPException(status_code=404, detail="Durak bulunamadı")

    db.delete(db_stop)
    db.commit()
    return {"detail": f"Durak (id: {stop_id}) silindi"}

def get_stops(import_id:int,db:Session):
     db_stops=db.query(Stop).filter(Stop.import_id==import_id).all()
     if not db_stops:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_stops


def get_stops_as_dataframe(import_id: int, db: Session):
    stops = db.query(Stop).filter(Stop.import_id == import_id).all()

    data = [
        {
            "stop_id": s.stop_id,
            "stop_name": s.stop_name,
            "stop_lat": s.stop_lat,
            "stop_lon": s.stop_lon,
        }
        for s in stops
    ]

    return pd.DataFrame(data)
