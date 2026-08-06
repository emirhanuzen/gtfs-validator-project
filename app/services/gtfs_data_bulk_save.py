from app.models.stop_time import StopTime
from sqlalchemy.orm import Session
import pandas as pd
import os

def save_stop_times(import_id:int,extracted_path:str,db:Session):
    stop_times_path=os.path.join(extracted_path,"stop_times.txt")

    for chunk in pd.read_csv(stop_times_path, chunksize=5000):
        stop_times_obj=[]
        for _,row in chunk.iterrows():
            stop_times=StopTime(
                import_id=import_id,
                trip_id=row["trip_id"],
                stop_id=row["stop_id"],
                stop_sequence=row["stop_sequence"],
                arrival_time=row.get("arrival_time"),
                departure_time=row.get("departure_time")
            )
            stop_times_obj.append(stop_times)
        db.bulk_save_objects(stop_times_obj)    
        db.commit()




               