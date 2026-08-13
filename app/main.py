from fastapi import FastAPI
from app.routers import import_gtfs,agency,route,stop,stop_time,trip

app=FastAPI(title="GTFS-VALİDATOR-PROJECT")

app.include_router(import_gtfs.router)
app.include_router(agency.router)
app.include_router(route.router)
app.include_router(stop.router)
app.include_router(stop_time.router)
app.include_router(trip.router)
