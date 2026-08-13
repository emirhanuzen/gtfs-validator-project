from app.models.trip import Trip
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.schemas.trip import TripUpdate 

def update_trip(import_id: int, trip_id: int, update_data: TripUpdate, db: Session):
    db_trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.import_id == import_id
    ).first()

    if not db_trip:
        raise HTTPException(status_code=404, detail="Sefer bulunamadı")

    if update_data.route_id is not None:
        db_trip.route_id = update_data.route_id
    if update_data.service_id is not None:
        db_trip.service_id = update_data.service_id

    db.commit()
    db.refresh(db_trip)
    return db_trip

def delete_trip(import_id: int, trip_id: int, db: Session):
    db_trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.import_id == import_id
    ).first()

    if not db_trip:
        raise HTTPException(status_code=404, detail="Sefer bulunamadı")

    db.delete(db_trip)
    db.commit()
    return {"detail": f"Sefer (id: {trip_id}) silindi"}

def get_trips(import_id:int,db:Session):
     db_trips=db.query(Trip).filter(Trip.import_id==import_id).all()
     if not db_trips:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_trips
