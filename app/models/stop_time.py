from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base

class StopTime(Base):
    __tablename__ = "stop_times"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("import_gtfs.id"), nullable=False)

    trip_id = Column(String, nullable=False)
    stop_id = Column(String, nullable=False)
    stop_sequence = Column(Integer, nullable=False)
    arrival_time = Column(String)
    departure_time = Column(String)