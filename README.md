# GTFS Feed Processing Service

GTFS formatındaki toplu taşıma verisi (.zip) yükleme ve arka planda asenkron olarak işleme (doğrulama + veritabanına kaydetme) yapan bir backend servisi. FastAPI, Celery, RabbitMQ ve PostgreSQL kullanılarak, event-driven bir mimariyle geliştirilmektedir.

> **Not:** Proje aktif geliştirme aşamasındadır. Bu README, mevcut ilerlemeyi yansıtır, tamamlanmamış bölümler aşağıda belirtilmiştir.

## Kullanılan Teknolojiler

- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM
- **Alembic** — veritabanı migration yönetimi
- **PostgreSQL** — veritabanı
- **Celery** — asenkron görev kuyruğu (arka plan işleme)
- **RabbitMQ** — mesaj broker (task kuyruğu + event yayınlama)
- **Docker & Docker Compose** — konteynerleştirme *(henüz eklenmedi)*

## Proje Yapısı

Katmanlı (layered) bir mimariyle organize edilmiştir:

```
app/
├── main.py                  # Uygulama girişi
├── config.py                 # .env okuma (DATABASE_URL, RABBITMQ_URL, UPLOAD_DIR)
├── dependencies.py            # get_db
├── db/
│   └── database.py               # SQLAlchemy engine, SessionLocal, Base
├── models/
│   └── import_gtfs.py              # ImportGtfs modeli, ImportStatus enum
├── schemas/
│   └── import_gtfs.py              # ImportResponse şeması
├── services/
│   └── import_gtfs.py              # İş mantığı (create_import, get_import)
├── routers/
│   └── imports.py                  # POST /import_gtfs/, GET /import_gtfs/{id}
├── tasks/                     # Celery worker ve task tanımları (geliştiriliyor)
├── validation/                # GTFS format kontrolleri (geliştiriliyor)
└── events/                    # RabbitMQ event yayınlama (geliştiriliyor)
alembic/                     # Migration dosyaları
requirements.txt
.env.example
```

## Temel İş Akışı

1. Kullanıcı `POST /import_gtfs/` ile bir GTFS `.zip` dosyası yükler.
2. API dosyayı `UPLOAD_DIR` altına kaydeder, veritabanında bir `ImportGtfs` kaydı oluşturur (`status: uploaded`) ve kullanıcıya bir `import_id` döner.
3. *(Geliştiriliyor)* Dosyanın işlenmesi Celery üzerinden arka plandaki bir worker'a gönderilir.
4. *(Geliştiriliyor)* Worker ZIP'i açar, GTFS dosyalarını okur, doğrular, veritabanına yazar.
5. Kullanıcı `GET /import_gtfs/{id}` ile işlemin güncel durumunu istediği an sorgulayabilir.
6. *(Geliştiriliyor)* İşlem tamamlandığında/başarısız olduğunda RabbitMQ üzerinden bir event yayınlanır.

## Import Durumları

| Durum | Açıklama |
|---|---|
| `uploaded` | Dosya alındı, kuyruğa henüz gönderilmedi/gönderiliyor |
| `queued` | Görev RabbitMQ kuyruğunda, worker almayı bekliyor |
| `processing` | Worker dosyayı işliyor |
| `completed` | Başarıyla tamamlandı |
| `completed_with_warnings` | Tamamlandı ama bazı uyarılar var |
| `failed` | İşlem başarısız oldu, detay için `error_message` alanına bakın |

## Tasarım Kararları

- **Senkron / asenkron ayrımı:** API katmanı (`FastAPI`) sadece isteği kabul edip hemen cevap döner (`202`), ağır işlem HTTP isteği içinde yapılmaz — tamamen Celery worker'a devredilir.
- **Durum takibi (pull) vs event (push):** `status` alanı, kullanıcının istediği an sorgulayabileceği kalıcı bir durum bilgisidir (PostgreSQL üzerinden). Event ise worker'ın işini bitirince kendiliğinden yayınladığı, kalıcı olmayan bir bildirim mekanizmasıdır — ikisi farklı amaçlara hizmet eder.
- **Event exchange/routing key:** `exchange: gtfs.events`, `routing key: gtfs.import.*` (`gtfs.import.completed` / `gtfs.import.failed`) olarak planlanmıştır.
- **Hata yönetimi:** Servis katmanında `HTTPException` fırlatma prensibi benimsenmiştir; router'lar servisi çağırıp sonucu döndürmekten sorumludur.

## Kurulum (geliştirme aşaması)

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

`.env.example` dosyasını `.env` olarak kopyalayıp kendi değerlerinizi girin:

```
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/gtfs_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672//
UPLOAD_DIR=uploads
```

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

API: `http://localhost:8000`
Swagger dokümantasyonu: `http://localhost:8000/docs`

