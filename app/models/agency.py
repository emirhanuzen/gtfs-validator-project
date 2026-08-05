from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base

class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("import_gtfs.id"), nullable=False)

    agency_name = Column(String, nullable=False)
    agency_url = Column(String)
    agency_timezone = Column(String)