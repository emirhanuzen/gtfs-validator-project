from app.models.stop_time import  StopTime 
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.schemas.stop_time import  StopTimeResponse

def get_stop_times(import_id:int,db:Session,limit:int=100,offset:int=0):
     db_stop_times=db.query(StopTime).filter(StopTime.import_id==import_id).offset(offset).limit(limit).all()
     if not db_stop_times:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_stop_times