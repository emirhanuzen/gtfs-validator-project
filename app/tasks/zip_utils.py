import zipfile
import os

MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024  # 200 MB limit

def extract_zip(zip_path: str):
    extract_dir=zip_path.replace(".zip","")
    os.makedirs(extract_dir,exist_ok=True)

    with zipfile.ZipFile(zip_path,"r") as zip_ref:
        total_size=0

        for file_info in zip_ref.infolist():
            member_path=os.path.join(extract_dir,file_info.filename)
            real_extract_dir=os.path.abspath(extract_dir)
            real_member_path=os.path.abspath(member_path)
            #Path traversal sorunu
            if not real_member_path.startswith(real_extract_dir):
                raise ValueError(f"Güvensiz dosya tespit edildi:{file_info.filename}")
            #Zip bomb sorunu
            total_size+=file_info.file_size
            if total_size>MAX_UNCOMPRESSED_SIZE:
                raise ValueError("Çıkarılan ZIP içeriği izin verilen boyut sınırını aşıyor")

        zip_ref.extractall(extract_dir)

    return extract_dir 