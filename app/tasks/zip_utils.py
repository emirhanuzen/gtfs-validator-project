import zipfile
import os

def extract_zip(zip_path: str):
    extract_dir=zip_path.replace(".zip","")
    os.makedirs(extract_dir,exist_ok=True)

    with zipfile.ZipFile(zip_path,"r") as zip_ref:
        zip_ref.extractall(extract_dir)

    return extract_dir 