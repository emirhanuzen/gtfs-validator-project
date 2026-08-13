from app.schemas.stop  import StopUpdate,StopResponse  
from app.services import stop 
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db

router=APIRouter(prefix="/import_gtfs",tags=["stop"])

@router.get("/{import_id}/stops",response_model=list[StopResponse])
def get_stops(import_id:int,db:Session=Depends(get_db)):
    return stop.get_stops(import_id,db)

@router.put("/{import_id}/stops/{stop_id}", response_model=StopResponse)
def update_stop(import_id: int, stop_id: int, update_data: StopUpdate, db: Session = Depends(get_db)):
    return stop.update_stop(import_id, stop_id, update_data, db)

@router.delete("/{import_id}/stops/{stop_id}")
def delete_stop(import_id: int, stop_id: int, db: Session = Depends(get_db)):
    return stop.delete_stop(import_id, stop_id, db)