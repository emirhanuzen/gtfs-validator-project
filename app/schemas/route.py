from pydantic import BaseModel
from datetime import datetime

class RouteResponse(BaseModel):
    id:int
    import_id:int
    route_id:str
    route_short_name:str|None
    route_long_name:str|None
    route_type:int|None

    class Config:
        from_attributes=True
        