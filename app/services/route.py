from app.models.route import  Route  
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.schemas.route import  RouteUpdate
import pandas as pd

def get_routes(import_id:int,db:Session):
     db_routes=db.query(Route).filter(Route.import_id==import_id).all()
     if not db_routes:
          raise HTTPException(status_code=404,detail="Aradığınız id'de kayıt yok")
     return db_routes

def update_route(import_id: int, route_id: int, update_data: RouteUpdate, db: Session):
    db_route = db.query(Route).filter(
        Route.id == route_id,
        Route.import_id == import_id
    ).first()

    if not db_route:
        raise HTTPException(status_code=404, detail="Hat bulunamadı")

    if update_data.route_short_name is not None:
        db_route.route_short_name = update_data.route_short_name
    if update_data.route_long_name is not None:
        db_route.route_long_name = update_data.route_long_name
    if update_data.route_type is not None:
        db_route.route_type = update_data.route_type

    db.commit()
    db.refresh(db_route)
    return db_route

def delete_route(import_id: int, route_id: int, db: Session):
    db_route = db.query(Route).filter(
        Route.id == route_id,
        Route.import_id == import_id
    ).first()

    if not db_route:
        raise HTTPException(status_code=404, detail="Hat bulunamadı")

    db.delete(db_route)
    db.commit()
    return {"detail": f"Hat (id: {route_id}) silindi"}

def get_routes_as_dataframe(import_id: int, db:Session):
    routes = db.query(Route).filter(Route.import_id == import_id).all()

    data = [
        {
            "route_id": r.route_id,
            "route_short_name": r.route_short_name,
            "route_long_name": r.route_long_name,
            "route_type": r.route_type,
        }
        for r in routes
    ]

    return pd.DataFrame(data)