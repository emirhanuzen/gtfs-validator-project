from app.models.agency import  Agency
from fastapi import HTTPException
from sqlalchemy.orm import Session

def get_agency(import_id:int,db:Session):
     db_agency=db.query(Agency).filter(Agency.import_id==import_id).all()
     if not db_agency:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_agency