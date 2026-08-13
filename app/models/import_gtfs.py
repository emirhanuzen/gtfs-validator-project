import enum
from sqlalchemy import Column, Integer, String,ForeignKey,Enum as SqlEnum,DateTime,func,Text
from app.db.database import Base
from sqlalchemy.orm import relationship

class ImportStatus(str,enum.Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    COMPLETED_WITH_WARNINGS = "completed_with_warnings"
    FAILED = "failed"

class ImportGtfs(Base):
    __tablename__="import_gtfs"
    id=Column(Integer,primary_key=True,index=True)
    file_name=Column(String)
    file_path=Column(String)
    status=Column(SqlEnum(ImportStatus),default=ImportStatus.UPLOADED)
    created_at=Column(DateTime,server_default=func.now())
    updated_at=Column(DateTime,onupdate=func.now())         
    error_message=Column(Text,nullable=True)
    file_checksum = Column(String, nullable=True)
    celery_task_id = Column(String, nullable=True)
    
