from pydantic import BaseModel
from datetime import datetime

class StopResponse(BaseModel):
    id:int
    import_id:int
    
    stop_id:int
    stop_name:str |None
    stop_lat:float |None
    stopl_lon:float|None

    class Config:
        from_attributes=True