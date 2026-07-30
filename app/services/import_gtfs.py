from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.import_gtfs import ImportGtfs

def create_import(file_name:str,file_path:str,db:Session):
    try:
        db_import=ImportGtfs(file_name=file_name,file_path=file_path)
        db.add(db_import)
        db.commit()
        db.refresh(db_import)
        return db_import
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500,detail="Dosya yüklenmedi")

def get_import(file_id:int,db:Session):
    db_import=db.query(ImportGtfs).filter(ImportGtfs.id==file_id).first()
    if not db_import:
            raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
    return db_import