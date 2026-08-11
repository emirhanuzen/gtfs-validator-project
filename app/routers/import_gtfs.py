import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.import_gtfs import ImportResponse
from app.schemas.stop_time   import  StopTimeResponse
from app.schemas.stop        import   StopResponse 
from app.schemas.trip        import   TripResponse
from app.schemas.agency       import  AgencyResponse
from app.schemas.route        import  RouteResponse
from app.services import import_gtfs
from app.config import settings
from app.tasks.gtfs_import_task import process_gtfs_import 
import uuid
from fastapi.responses import StreamingResponse

router=APIRouter(prefix="/import_gtfs",tags=["import_gtfs"])

@router.post("/",response_model=ImportResponse)
def create_import(file:UploadFile,db:Session=Depends(get_db)):
    if not file.filename.endswith("zip"):
        raise HTTPException(status_code=400,detail="Sadece .zip dosyası kabul edilmektedir")
    os.makedirs(settings.UPLOAD_DIR,exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    UPLOAD_DIR_ZIPS=os.path.join(settings.UPLOAD_DIR,"zips")
    os.makedirs(UPLOAD_DIR_ZIPS,exist_ok=True)
    file_path=os.path.join(UPLOAD_DIR_ZIPS,unique_name)
    with open(file_path,"wb") as buffer:
        shutil.copyfileobj(file.file,buffer)

    db_import=import_gtfs.create_import(file.filename,file_path,db)
    process_gtfs_import.delay(db_import.id)
    return db_import
    

@router.get("/{file_id}",response_model=ImportResponse)
def get_import(file_id:int,db:Session=Depends(get_db)):
    return import_gtfs.get_import(file_id,db)

@router.get("/",response_model=list[ImportResponse])
def get_import(db:Session=Depends(get_db)):
    return import_gtfs.get_import_all(db)

@router.get("/{import_id}/routes",response_model=list[RouteResponse])
def get_routes(import_id:int,db:Session=Depends(get_db)):
    return import_gtfs.get_routes(import_id,db)

@router.get("/{import_id}/trips",response_model=list[TripResponse])
def get_trips(import_id:int,db:Session=Depends(get_db)):
    return import_gtfs.get_trips(import_id,db)

@router.get("/{import_id}/stops",response_model=list[StopResponse])
def get_stops(import_id:int,db:Session=Depends(get_db)):
    return import_gtfs.get_stops(import_id,db)

@router.get("/{import_id}/stop_times",response_model=list[StopTimeResponse])
def get_stop_times(import_id:int,db:Session=Depends(get_db),limit:int=100,offset:int=0):
    return import_gtfs.get_stop_times(import_id,db,limit=limit,offset=offset)

@router.get("/{import_id}/agency",response_model=list[AgencyResponse])
def get_agency(import_id:int,db:Session=Depends(get_db)):
    return import_gtfs.get_agency(import_id,db)

@router.get("/{import_id}/stream")
def stream_import_status(import_id:int):
    return StreamingResponse(
        import_gtfs.event_stream(import_id),
        media_type="text/event-stream"
    )




