from app.schemas.trip  import TripResponse,TripUpdate
from app.services import trip
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db

router=APIRouter(prefix="/import_gtfs",tags=["trip"])

@router.get("/{import_id}/trips",response_model=list[TripResponse])
def get_trips(import_id:int,db:Session=Depends(get_db)):
    return trip.get_trips(import_id,db)

@router.put("/{import_id}/trips/{trip_id}", response_model=TripResponse)
def update_trip(import_id: int, trip_id: int, update_data: TripUpdate, db: Session = Depends(get_db)):
    return trip.update_trip(import_id, trip_id, update_data, db)

@router.delete("/{import_id}/trips/{trip_id}")
def delete_trip(import_id: int, trip_id: int, db: Session = Depends(get_db)):
    return trip.delete_trip(import_id, trip_id, db)