from app.schemas.stop_time  import   StopTimeResponse
from app.services import stop_time 
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db

router=APIRouter(prefix="/import_gtfs",tags=["stoP_time"])

@router.get("/{import_id}/stop_times",response_model=list[StopTimeResponse])
def get_stop_times(import_id:int,db:Session=Depends(get_db),limit:int=100,offset:int=0):
    return stop_time.get_stop_times(import_id,db,limit=limit,offset=offset)