from app.services import agency
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.agency       import  AgencyResponse

router=APIRouter(prefix="/import_gtfs",tags=["agency"])

@router.get("/{import_id}/agency",response_model=list[AgencyResponse])
def get_agency(import_id:int,db:Session=Depends(get_db)):
    return agency.get_agency(import_id,db)
