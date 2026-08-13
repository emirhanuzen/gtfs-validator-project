from fastapi.responses import FileResponse
from app.services.export import export_gtfs_zip
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db

router=APIRouter(prefix="/import_gtfs",tags=["export"])

@router.get("/{import_id}/export")
def export_import(import_id: int, db:Session = Depends(get_db)):
    zip_path = export_gtfs_zip(import_id, db)
    return FileResponse(
        path=zip_path,
        filename=f"gtfs_export_{import_id}.zip",
        media_type="application/zip"
    )