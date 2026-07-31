import os 
 

REQUIRED_FILES = ["agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt"]

def validate_gtfs_files(extracted_path:str):
    missing=[]
    for filename in REQUIRED_FILES:
        file_path=os.path.join(extracted_path,filename)
        if not os.path.exists(file_path):
            missing.append(filename)

    if missing:
        raise ValueError (f"Eksik GTFS dosyaları:{', '.join(missing)}")  