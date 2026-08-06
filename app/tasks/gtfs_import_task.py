import os
from app.db.database import SessionLocal
from app.tasks.celery_app import celery_app
from app.models.import_gtfs import ImportGtfs,ImportStatus
from app.tasks.zip_utils import extract_zip
from app.validation.gtfs_validator import (gtfs_validate_all,check_data_quality_warnings,check_optional_files)
from app.events.publisher import publish_event
from sqlalchemy.exc import SQLAlchemyError
from pika.exceptions import AMQPConnectionError
from sqlalchemy.exc import OperationalError
from app.services.gtfs_data_save import save_all_gtfs_data
import shutil

@celery_app.task(
        bind=True,
        autoretry_for=(OperationalError,AMQPConnectionError),
        retry_backoff=True,
        max_retries=3,
)

def process_gtfs_import(self,import_id:int):
    db=SessionLocal()
    db_import=db.query(ImportGtfs).filter(ImportGtfs.id==import_id).first()
    if not db_import:
            return "Kayıt bulunamadı"
    if db_import.status in [ImportStatus.COMPLETED,ImportStatus.FAILED]:
         return db_import    
    extracted_path=None
    try:
        db_import.status=ImportStatus.PROCESSING
        db.commit()
        extracted_path=extract_zip(db_import.file_path)
        gtfs_validate_all(extracted_path)
        save_all_gtfs_data(import_id,extracted_path,db)
        warnings=check_optional_files(extracted_path)+check_data_quality_warnings(extracted_path)
        if warnings:
             db_import.status=ImportStatus.COMPLETED_WITH_WARNINGS
        else:
             db_import.status=ImportStatus.COMPLETED
        publish_event(db_import.id, "completed",db_import.file_name)
        db.commit()
        db.refresh(db_import)
        return db_import
    except Exception as e:
        db.rollback()
        db_import.status=ImportStatus.FAILED
        db_import.error_message=str(e)
        db.commit()
        publish_event(db_import.id,"failed",db_import.file_name,error_message=str(e))
        db.refresh(db_import)
    finally:
        if extracted_path and os.path.exists(extracted_path):
            shutil.rmtree(extracted_path)       
        db.close()     
