from fastapi import FastAPI
from app.routers import import_gtfs

app=FastAPI(title="GTFS-VALİDATOR-PROJECT")

app.include_router(import_gtfs.router)
