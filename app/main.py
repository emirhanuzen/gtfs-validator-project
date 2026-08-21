from fastapi import FastAPI
from app.routers import import_gtfs,agency,route,stop,stop_time,trip,export,upload_session
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI(title="GTFS-VALİDATOR-PROJECT")

app.include_router(import_gtfs.router,tags=["import_gtfs"])
app.include_router(agency.router,tags=["agency"])
app.include_router(route.router,tags=["route"])
app.include_router(stop.router,tags=["stop"])
app.include_router(stop_time.router,tags=["stop_time"])
app.include_router(trip.router,tags=["trip"])
app.include_router(export.router,tags=["export"])
app.include_router(upload_session.router,tags=["upload_session"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
