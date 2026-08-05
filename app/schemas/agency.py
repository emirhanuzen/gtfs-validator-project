from pydantic import BaseModel

class AgencyResponse(BaseModel):
    id: int
    agency_name: str
    agency_url: str | None
    agency_timezone: str | None

    class Config:
        from_attributes = True