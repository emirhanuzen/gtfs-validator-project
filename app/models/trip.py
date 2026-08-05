from sqlalchemy import Column, Integer, String, ForeignKey,Float
from app.db.database import Base

class Trip(Base):
    __tablename__="trips"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("import_gtfs.id"), nullable=False)

    trip_id = Column(String, nullable=False)
    route_id = Column(String, nullable=False)
    service_id = Column(String,nullable=False)