from app.models.agency import  Agency
from fastapi import HTTPException
from sqlalchemy.orm import Session
import pandas as pd

def get_agency(import_id:int,db:Session):
     db_agency=db.query(Agency).filter(Agency.import_id==import_id).all()
     if not db_agency:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_agency

def get_agency_as_dataframe(import_id: int, db: Session):
    agencies = db.query(Agency).filter(Agency.import_id == import_id).all()

    data = [
        {
            "agency_name": a.agency_name,
            "agency_url": a.agency_url,
            "agency_timezone": a.agency_timezone,
        }
        for a in agencies
    ]

    return pd.DataFrame(data)