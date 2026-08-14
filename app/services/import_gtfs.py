from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.import_gtfs  import ImportGtfs
import hashlib,time,json
from app.models.import_gtfs import ImportStatus
from app.db.database import SessionLocal
from app.tasks.celery_app import celery_app

def create_import(db: Session, file_name: str, file_path: str, checksum: str):
    try:
        db_import = ImportGtfs(
            file_name=file_name,
            file_path=file_path,
            file_checksum=checksum
        )
        db.add(db_import)
        db.commit()
        db.refresh(db_import)
        return db_import
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Dosya yüklenmedi: {str(e)}")

def get_import(file_id:int,db:Session):
    db_import=db.query(ImportGtfs).filter(ImportGtfs.id==file_id).first()
    if not db_import:
            raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
    return db_import

def get_import_all(db:Session):
     db_import=db.query(ImportGtfs).all()
     return db_import

def calculate_checksum(file_path):
    sha256_hash = hashlib.sha256()

    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(4096)
            if not chunk:
                break
            sha256_hash.update(chunk)

    return sha256_hash.hexdigest()

def event_stream(import_id: int):
    while True:
        db = SessionLocal()
        try:
            db_import = db.query(ImportGtfs).filter(ImportGtfs.id == import_id).first()

            if not db_import:
                yield f"data: {json.dumps({'error': 'kayıt bulunamadı'})}\n\n"
                break

            message = {"status": db_import.status.value, "error_message": db_import.error_message}
            yield f"data: {json.dumps(message)}\n\n"

            if db_import.status in [ImportStatus.COMPLETED, ImportStatus.COMPLETED_WITH_WARNINGS, ImportStatus.FAILED]:
                break
        finally:
            db.close()

        time.sleep(2)

def retry_import(import_id: int, db: Session):
    db_import = db.query(ImportGtfs).filter(ImportGtfs.id == import_id).first()
    if not db_import:
        raise HTTPException(status_code=404, detail="Import bulunamadı")
    if db_import.status != ImportStatus.FAILED:
        raise HTTPException(status_code=400, detail="Sadece başarısız (failed) import'lar tekrar çalıştırılabilir")
    db_import.status = ImportStatus.UPLOADED
    db_import.error_message = None
    db.commit()
    db.refresh(db_import)
    return db_import

def cancel_import(import_id: int, db: Session):
    db_import = db.query(ImportGtfs).filter(ImportGtfs.id == import_id).first()

    if not db_import:
        raise HTTPException(status_code=404, detail="Import bulunamadı")

    if db_import.status not in [ImportStatus.UPLOADED, ImportStatus.QUEUED]:
        raise HTTPException(status_code=400, detail="Sadece henüz işlenmemiş import'lar iptal edilebilir")

    if db_import.celery_task_id:
        celery_app.control.revoke(db_import.celery_task_id)

    db_import.status = ImportStatus.FAILED
    db_import.error_message = "Kullanıcı tarafından iptal edildi"
    db.commit()
    db.refresh(db_import)
    return db_import