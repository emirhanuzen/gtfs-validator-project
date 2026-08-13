from app.models.stop_time import  StopTime 
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.schemas.stop_time import  StopTimeResponse
import pandas as pd

def get_stop_times(import_id:int,db:Session,limit:int=100,offset:int=0):
     db_stop_times=db.query(StopTime).filter(StopTime.import_id==import_id).offset(offset).limit(limit).all()
     if not db_stop_times:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_stop_times

def get_stop_times_as_dataframe(import_id: int, db: Session):
    stop_times = db.query(StopTime).filter(StopTime.import_id == import_id).all()

    data = [
        {
            "trip_id": st.trip_id,
            "stop_id": st.stop_id,
            "stop_sequence": st.stop_sequence,
            "arrival_time": st.arrival_time,
            "departure_time": st.departure_time,
        }
        for st in stop_times
    ]

    return pd.DataFrame(data)