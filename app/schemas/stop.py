from pydantic import BaseModel
from datetime import datetime

class StopResponse(BaseModel):
    id:int
    import_id:int
    
    stop_id:str
    stop_name:str |None
    stop_lat:float |None
    stop_lon:float|None

    class Config:
        from_attributes=True

class StopUpdate(BaseModel):
    stop_name: str | None = None
    stop_lat: float | None = None
    stop_lon: float | None = None