import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.import_gtfs import ImportResponse
from app.schemas.stop_time   import  StopTimeResponse
from app.schemas.stop        import   StopResponse ,StopUpdate
from app.schemas.trip        import   TripResponse,TripUpdate
from app.schemas.agency       import  AgencyResponse
from app.schemas.route        import  RouteResponse,RouteUpdate
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

@router.post("/{import_id}/retry", response_model=ImportResponse)
def retry_import(import_id: int, db: Session = Depends(get_db)):
    db_import = import_gtfs.retry_import(import_id, db)
    process_gtfs_import.delay(db_import.id)
    return db_import

@router.put("/stops/{stop_id}", response_model=StopResponse)
def update_stop(stop_id: int, update_data: StopUpdate, db: Session = Depends(get_db)):
    return import_gtfs.update_stop(stop_id, update_data, db)

@router.delete("/stops/{stop_id}")
def delete_stop(stop_id: int, db: Session = Depends(get_db)):
    return import_gtfs.delete_stop(stop_id, db)

@router.put("/routes/{route_id}", response_model=RouteResponse)
def update_route(route_id: int, update_data: RouteUpdate, db: Session = Depends(get_db)):
    return import_gtfs.update_route(route_id, update_data, db)

@router.delete("/routes/{route_id}")
def delete_route(route_id: int, db: Session = Depends(get_db)):
    return import_gtfs.delete_route(route_id, db)

@router.put("/trips/{trip_id}", response_model=TripResponse)
def update_trip(trip_id: int, update_data: TripUpdate, db: Session = Depends(get_db)):
    return import_gtfs.update_trip(trip_id, update_data, db)

@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    return import_gtfs.delete_trip(trip_id, db)

