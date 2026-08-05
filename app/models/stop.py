from sqlalchemy import Column, Integer, String, ForeignKey,Float
from app.db.database import Base

class Stop(Base):
    __tablename__="stops"

    id=Column(Integer,primary_key=True,index=True)
    import_id=Column(Integer,ForeignKey("import_gtfs.id"),nullable=False)

    stop_id=Column(String,nullable=False)
    stop_name=Column(String)
    stop_lat=Column(Float)
    stopl_lon=Column(Float)
    