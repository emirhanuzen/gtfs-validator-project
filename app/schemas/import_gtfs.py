from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class ImportResponse(BaseModel):
    id:int
    file_name:str
    status:Literal["uploaded","queued","processing","completed","completed_with_warnings","failed"]
    created_at:datetime
    updated_at:datetime|None=None
    error_message:str|None=None
    class Config:
        from_attributes=True
    


