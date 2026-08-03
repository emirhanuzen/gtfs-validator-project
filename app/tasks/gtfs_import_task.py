import os
from app.db.database import SessionLocal
from app.tasks.celery_app import celery_app
from app.models.import_gtfs import ImportGtfs,ImportStatus
from app.tasks.zip_utils import extract_zip
from app.validation.gtfs_validator import validate_gtfs_files,validate_columns,validate_references
import shutil
from app.events.publisher import publish_event

@celery_app.task
def process_gtfs_import(import_id:int):
    db=SessionLocal()
    db_import=db.query(ImportGtfs).filter(ImportGtfs.id==import_id).first()
    if not db_import:
            return "Kayıt bulunamadı"
    try:
        db_import.status=ImportStatus.PROCESSING
        db.commit()
        extracted_path=extract_zip(db_import.file_path)
        validate_gtfs_files(extracted_path)
        validate_columns(extracted_path)
        validate_references(extracted_path)
        db_import.status=ImportStatus.COMPLETED
        db.commit()
        publish_event(db_import.id, "completed")
        db.refresh(db_import)
        return db_import
    except Exception as e:
        db.rollback()
        db_import.status=ImportStatus.FAILED
        db_import.error_message=str(e)
        db.commit()
        publish_event(db_import.id,"failed",error_message=str(e))
        db.refresh(db_import)
    finally:
        if extracted_path and os.path.exists(extracted_path):
            shutil.rmtree(extracted_path)       
        db.close()     
