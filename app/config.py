import os
from dotenv import load_dotenv


#os.getenv("") kullanmadık çünkü none değer döndürür hata dönmez boş ise.
#os.environ("") key error fırlatır.
load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]
RABBITMQ_URL = os.environ["RABBITMQ_URL"]
UPLOAD_DIR=os.environ["UPLOAD_DIR"]