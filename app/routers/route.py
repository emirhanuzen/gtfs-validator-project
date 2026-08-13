from app.schemas.route   import  RouteResponse,RouteUpdate
from app.services import route
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db

router=APIRouter(prefix="/import_gtfs",tags=["route"])

@router.get("/{import_id}/routes",response_model=list[RouteResponse])
def get_routes(import_id:int,db:Session=Depends(get_db)):
    return route.get_routes(import_id,db)


@router.put("/{import_id}/routes/{route_id}", response_model=RouteResponse)
def update_route(import_id: int, route_id: int, update_data: RouteUpdate, db: Session = Depends(get_db)):
    return route.update_route(import_id, route_id, update_data, db)

@router.delete("/{import_id}/routes/{route_id}")
def delete_route(import_id: int, route_id: int, db: Session = Depends(get_db)):
    return route.delete_route(import_id, route_id, db)