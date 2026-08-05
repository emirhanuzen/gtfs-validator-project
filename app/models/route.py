from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base

class Route(Base):
    __tablename__="routes"

    id=Column(Integer,primary_key=True,index=True)
    import_id=Column(Integer,ForeignKey("import_gtfs.id"),nullable=False)

    route_id=Column(String,nullable=False)
    route_short_name=Column(String)
    route_long_name=Column(String)
    route_type=Column(Integer)