from pydantic import BaseModel
from datetime import datetime

class TripResponse(BaseModel):
    id:int
    import_id:int
    
    trip_id:int
    route_id:int
    service_id:int

    class Config:
        from_attributes=True

class TripUpdate(BaseModel):
    route_id: str | None = None
    service_id: str | None = None