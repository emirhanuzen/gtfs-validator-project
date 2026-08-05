import os
from app.db.database import SessionLocal
from app.tasks.celery_app import celery_app
from app.models.import_gtfs import ImportGtfs,ImportStatus
from app.tasks.zip_utils import extract_zip
from app.validation.gtfs_validator import (validate_gtfs_files,validate_columns,
validate_references,validate_stop_sequences,check_data_quality_warnings,
validate_field_values,validate_unique_ids,validate_service_references,validate_dates,validate_times,check_optional_files)
import shutil
from app.events.publisher import publish_event
from sqlalchemy.exc import SQLAlchemyError
from pika.exceptions import AMQPConnectionError
from sqlalchemy.exc import OperationalError

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
    try:
        db_import.status=ImportStatus.PROCESSING
        db.commit()
        extracted_path=extract_zip(db_import.file_path)
        validate_gtfs_files(extracted_path)
        validate_columns(extracted_path)
        validate_references(extracted_path)
        validate_stop_sequences(extracted_path)
        validate_field_values(extracted_path)
        validate_unique_ids(extracted_path)
        validate_service_references(extracted_path)
        validate_dates(extracted_path)
        validate_times(extracted_path)
        warnings=check_optional_files(extracted_path)+check_data_quality_warnings(extracted_path)
        if warnings:
             db_import.status=ImportStatus.COMPLETED_WITH_WARNINGS
        else:
             db_import.status=ImportStatus.COMPLETED
        db_import.status=ImportStatus.COMPLETED
        db.commit()
        publish_event(db_import.id, "completed",db_import.file_name)
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
