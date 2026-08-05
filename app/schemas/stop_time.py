from pydantic import BaseModel
from datetime import datetime

class StopTimeResponse(BaseModel):
    id:int  
    import_id:int 
    trip_id:int 
    stop_id:int
    stop_sequence:int
    arrival_time:int |None
    departure_time:int |None

    class Config:
        from_attributes=True