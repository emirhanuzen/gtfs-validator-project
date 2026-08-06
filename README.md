# GTFS Feed Processing Service

GTFS formatındaki toplu taşıma verisi (.zip) yükleme, arka planda asenkron olarak doğrulama ve veritabanına kaydetme yapan bir backend servisi. FastAPI, Celery, RabbitMQ ve PostgreSQL kullanılarak, event-driven bir mimariyle geliştirilmiştir.

## Kullanılan Teknolojiler

- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM
- **Alembic** — veritabanı migration yönetimi
- **PostgreSQL** — veritabanı
- **Celery** — asenkron görev kuyruğu (arka plan işleme)
- **RabbitMQ** — mesaj broker (task kuyruğu + event yayınlama)
- **pandas** — GTFS CSV dosyalarının okunması, doğrulanması, büyük dosyalar için parçalı (chunked) okuma
- **pika** — RabbitMQ ile doğrudan event yayınlama/dinleme
- **Pydantic Settings** — merkezi, tip güvenli env değişkeni yönetimi
- **Docker** — konteynerleştirme (PostgreSQL, RabbitMQ için; API/worker için Docker Compose planlanıyor)

## Proje Yapısı

```
app/
├── main.py                     # Uygulama girişi
├── config.py                    # Pydantic Settings ile .env okuma
├── dependencies.py               # get_db
├── db/
│   └── database.py                  # SQLAlchemy engine, SessionLocal, Base
├── models/
│   ├── import_gtfs.py                 # ImportGtfs modeli, ImportStatus enum
│   ├── agency.py, route.py, stop.py, trip.py, stop_time.py   # GTFS veri modelleri
├── schemas/
│   └── (her model için Response şeması)
├── services/
│   ├── import_gtfs.py                # Import CRUD + GTFS veri sorgulama (routes/stops/trips/stop_times)
│   ├── gtfs_data_save.py             # Agency/Route/Stop/Trip kaydetme
│   └── gtfs_data_bulk_save.py        # StopTime kaydetme (chunked + bulk insert)
├── routers/
│   └── import_gtfs.py                # Tüm endpoint'ler
├── tasks/
│   ├── celery_app.py                  # Celery kurulumu
│   ├── gtfs_import_task.py            # Orkestratör: doğrula → kaydet → durumu güncelle → event yayınla
│   └── zip_utils.py                   # Güvenli ZIP açma (path traversal + zip bomb koruması)
├── validation/
│   └── gtfs_validator.py              # Tüm GTFS doğrulama fonksiyonları
├── events/
│   └── publisher.py                   # RabbitMQ event yayınlama
└── consumers/
    └── audit_consumer.py              # Event'leri dinleyen örnek consumer
alembic/                          # Migration dosyaları
requirements.txt
.env.example
```

## Temel İş Akışı

1. Kullanıcı `POST /import_gtfs/` ile bir GTFS `.zip` dosyası yükler.
2. API dosyayı `uploads/zips/` altına (benzersiz isimle) kaydeder, veritabanında bir `ImportGtfs` kaydı oluşturur (`status: uploaded`) ve kullanıcıya bir `import_id` döner (senkron, anında dönüş).
3. Celery worker'a `process_gtfs_import` task'ı gönderilir (asenkron).
4. Worker:
   - ZIP'i güvenli şekilde açar (path traversal ve zip bomb kontrolü ile)
   - GTFS dosyalarını kapsamlı şekilde doğrular (bkz. aşağıdaki liste)
   - Doğrulama başarılıysa, gerçek GTFS verisini (agency, routes, stops, trips, stop_times) veritabanına kaydeder — `stop_times` büyük olabileceği için parçalı (chunked) okunur ve toplu (bulk) yazılır
   - Durumu günceller: `completed`, `completed_with_warnings` (veri kalitesi uyarıları varsa) veya `failed`
   - RabbitMQ'ya bir event yayınlar (`gtfs.import.completed` / `gtfs.import.failed`)
5. Kullanıcı `GET /import_gtfs/{id}` ile durumu istediği an sorgulayabilir; işlem tamamlandıysa `GET /import_gtfs/{id}/routes`, `/stops`, `/trips`, `/stop_times`, `/agency` ile işlenmiş veriyi görüntüleyebilir (`stop_times` için `limit`/`offset` ile sayfalama desteklenir).

## GTFS Doğrulama Katmanı

- Zorunlu dosyaların varlığı (agency, stops, routes, trips, stop_times; calendar/calendar_dates'ten en az biri)
- Zorunlu kolonların varlığı
- Referans bütünlüğü: trip→route, stop_time→trip, stop_time→stop, trip→service (calendar/calendar_dates)
- Tekrarlanan birincil ID kontrolü (stop_id, route_id, trip_id)
- stop_sequence tekrar kontrolü (aynı trip içinde)
- Koordinat geçerliliği (stop_lat: -90/90, stop_lon: -180/180)
- Tarih format geçerliliği (calendar.txt start_date/end_date)
- Saat format ve mantıklılık kontrolü (stop_times arrival_time/departure_time, GTFS'in 24 saati aşabilen saat kuralına uygun şekilde regex ile)
- Veri kalitesi uyarıları (boş stop_name, boş route_short_name gibi durumlar → `completed_with_warnings`)

## Tasarım Kararları

- **Senkron / asenkron ayrımı:** API katmanı sadece isteği kabul edip hemen cevap döner, ağır işlem tamamen Celery worker'a devredilir.
- **Durum takibi (pull) vs event (push):** `status` alanı kullanıcının istediği an sorgulayabileceği kalıcı bir bilgidir; event ise worker'ın işini bitirince kendiliğinden yayınladığı, ayrı bir bildirim mekanizmasıdır.
- **Event exchange/routing key:** `exchange: gtfs.events` (topic tipi), `routing key: gtfs.import.*`. Örnek bir audit consumer (`app/consumers/audit_consumer.py`), bu event'leri dinleyip loglayarak mimarinin uçtan uca çalıştığını gösterir.
- **GTFS verisinin kendi ID'leri (`stop_id`, `trip_id` vb.) veritabanında ayrı bir `id` (kendi primary key'imiz) ile tutulur** — çünkü aynı GTFS ID'si farklı import'lar arasında çakışabilir; her satır ayrıca `import_id` foreign key'i ile hangi import'a ait olduğunu taşır.
- **Referans bütünlüğü veritabanı seviyesinde değil, validasyon aşamasında (pandas ile) kontrol edilir** — bulk insert performansını korumak için.
- **Hata yönetimi:** Servis katmanında `HTTPException` fırlatma prensibi benimsenmiştir; worker/validasyon katmanında ise `ValueError` kullanılır ve `error_message` alanına yazılır (HTTP isteğinden bağımsız oldukları için).
- **Idempotency:** Aynı task tekrar tetiklenirse (retry sonucu), zaten `completed`/`failed` durumundaki bir import yeniden işlenmez.
- **Retry:** Geçici altyapı hataları (`OperationalError`, `AMQPConnectionError`) otomatik olarak yeniden denenir (`retry_backoff`, `max_retries=3`); kalıcı hatalar (validasyon hataları) yeniden denenmez.

## Import Durumları

| Durum | Açıklama |
|---|---|
| `uploaded` | Dosya alındı |
| `queued` | Görev kuyrukta bekliyor |
| `processing` | Worker dosyayı işliyor |
| `completed` | Başarıyla tamamlandı |
| `completed_with_warnings` | Tamamlandı, veri kalitesi uyarıları var |
| `failed` | İşlem başarısız oldu, detay için `error_message`'a bakın |

## Kurulum (geliştirme aşaması)

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

`.env.example` dosyasını `.env` olarak kopyalayıp değerleri girin:

```
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/gtfs_db
RABBITMQ_URL=amqp://guest:guest@localhost:5672/%2F
UPLOAD_DIR=uploads
```

PostgreSQL ve RabbitMQ'yu geçici Docker konteynerleriyle ayağa kaldırın:

```bash
docker run --name gtfs-postgres -e POSTGRES_USER=kullanici -e POSTGRES_PASSWORD=sifre -e POSTGRES_DB=gtfs_db -p 5432:5432 -d postgres
docker run --name gtfs-rabbitmq -p 5672:5672 -p 15672:15672 -d rabbitmq:3-management
```

Migration'ları uygulayın:

```bash
alembic upgrade head
```

Üç ayrı terminalde çalıştırın:

```bash
uvicorn app.main:app --reload
celery -A app.tasks.celery_app worker --loglevel=info --pool=solo
python -m app.consumers.audit_consumer   # opsiyonel, event akışını izlemek için
```

API: `http://localhost:8000`
Swagger dokümantasyonu: `http://localhost:8000/docs`
RabbitMQ yönetim paneli: `http://localhost:15672`

## Yapılacaklar (TODO)

- [ ] Unit ve integration testleri (pytest)
- [ ] Docker Compose ile tüm sistemin (api, postgres, rabbitmq, celery worker) tek komutla ayağa kaldırılması
- [ ] Basit mimari diyagram dokümantasyona eklenmesi
- [ ] (Opsiyonel) `trips`/`stop_times` gibi büyük listeleme endpoint'lerine pagination'ın genişletilmesi
- [ ] (Opsiyonel) Belirli bir route'a ait trip'leri getiren alt endpoint
