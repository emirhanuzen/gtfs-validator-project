import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.import_gtfs import ImportResponse
from app.services import import_gtfs
from app.config import UPLOAD_DIR

router=APIRouter(prefix="/import_gtfs",tags=["import_gtfs"])

@router.post("/",response_model=ImportResponse)
def create_import(file:UploadFile,db:Session=Depends(get_db)):
    if not file.filename.endswith("zip"):
        raise HTTPException(status_code=400,detail="Sadece .zip dosyası kabul edilmektedir")

    os.makedirs(UPLOAD_DIR,exist_ok=True)
    file_path=os.path.join(UPLOAD_DIR,file.filename)
    with open(file_path,"wb") as buffer:
        shutil.copyfileobj(file.file,buffer)

    return import_gtfs.create_import(file.filename,file_path,db)

@router.get("/",response_model=ImportResponse)
def get_import(file_id:int,db:Session=Depends(get_db)):
    return import_gtfs.get_import(file_id,db)




