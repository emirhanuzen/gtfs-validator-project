from pydantic import BaseModel
from datetime import datetime

class StopTimeResponse(BaseModel):
    id:int  
    import_id:int 
    trip_id:int 
    stop_id:str
    stop_sequence:int
    arrival_time:str |None
    departure_time:str |None

    class Config:
        from_attributes=True