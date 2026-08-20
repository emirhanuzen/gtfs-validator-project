# GTFS Doğrulama Paneli — Frontend

GTFS doğrulama servisinin (FastAPI + Celery + RabbitMQ + PostgreSQL + MinIO) web arayüzü.
React (Vite) + Tailwind CSS ile yazıldı; ekstra state yönetimi kütüphanesi kullanılmadı,
API çağrıları düz `fetch` ile yapılıyor.

## Çalıştırma

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Üretim derlemesi:

```bash
npm run build        # dist/
npm run preview
```

Backend varsayılan olarak `http://localhost:8000` adresinde beklenir. Farklı bir adres için
`frontend/.env` dosyası oluşturun (`.env.example` dosyasını kopyalayabilirsiniz):

```
VITE_API_BASE_URL=http://localhost:8000
```

## CORS

Backend'de `app/main.py` içinde `CORSMiddleware` zaten `allow_origins=["*"]` ile ekli olduğu için
ek bir ayar gerekmiyor. Sıkılaştırmak isterseniz `allow_origins=["http://localhost:5173"]` yeterli
olur — arayüz çerez/kimlik bilgisi göndermiyor.

## Sayfalar

| Yol              | İçerik                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| `/`              | Sürükle-bırak ZIP yükleme + tüm içe aktarmaların tablosu                     |
| `/imports/:id`   | Tek bir içe aktarmanın canlı durumu + GTFS verisi sekmeleri                  |

### Ana sayfa

- ZIP dosyası sürükle-bırak ya da tıklayarak seçilir, `POST /import_gtfs/` ile yüklenir.
- Tabloda id, dosya adı, durum rozeti, oluşturulma tarihi ve işlem düğmeleri var.
- Listede tamamlanmamış bir kayıt varsa liste 3 saniyede bir sessizce tazelenir.

### Detay sayfası

- Durum `GET /import_gtfs/{id}/stream` (SSE) ile canlı izlenir; sayfa yenilemeye gerek yok.
- İşlem bittiğinde tam kayıt tekrar çekilir ve veri sekmeleri yeniden yüklenir.
- Sekmeler: hatlar (routes), duraklar (stops), seferler (trips), kurum (agency),
  durak saatleri (stop_times — 100'erlik sayfalama).
- routes / stops / trips satırlarında düzenle (modal, kısmi güncelleme) ve sil düğmeleri var.

### Durum rozetleri

| Durum                     | Renk                    |
| ------------------------- | ----------------------- |
| `uploaded`                | gri                     |
| `queued`                  | indigo                  |
| `processing`              | mavi + dönen spinner    |
| `completed`               | yeşil                   |
| `completed_with_warnings` | sarı                    |
| `failed`                  | kırmızı                 |

Düğmeler backend kurallarına göre gösterilir: **Tekrar dene** yalnız `failed`, **İptal et** yalnız
`uploaded`/`queued`, **GTFS olarak indir** `completed` ve `completed_with_warnings` durumlarında.

## Klasör yapısı

```
src/
  api/client.js            fetch sarmalayıcısı, ApiError, tüm uç noktalar
  hooks/useImportStream.js SSE ile canlı durum takibi (+ yedek yoklama)
  lib/status.js            durum etiketleri/renkleri ve iş kuralları
  lib/resources.js         sekmelerin kolon ve düzenlenebilir alan tanımları
  lib/format.js            tarih/hücre biçimlendirme
  components/              StatusBadge, UploadDropzone, ResourcePanel, EditModal, ...
  pages/                   ImportListPage, ImportDetailPage
```

## Backend davranışına dair notlar

Arayüz yazılırken denk gelinen ve istemci tarafında ele alınan noktalar:

1. **Liste uçları boş sonuçta 404 döndürüyor** (`routes`, `stops`, `trips`, `agency`,
   `stop_times` — `HTTPException(404, "Aradığınız id'de kayıt yok")`). `api.listResource`
   bu durumu boş diziye çeviriyor, aksi halde veri olmayan her sekme hata gösterirdi.
2. **PUT/DELETE yolundaki id, veritabanı birincil anahtarı.** `update_route` sorgusu
   `Route.id == route_id` filtresini kullanıyor, GTFS'teki metinsel `route_id` değil.
   Arayüz de bu yüzden satırdaki `row.id` değerini gönderiyor.
3. **SSE akışı iş bitince kapanıyor.** `EventSource` kapanan bağlantıyı kendiliğinden yeniden
   açtığı için terminal durum mesajı gelince bağlantıyı arayüz kapatıyor; aksi halde sonsuz
   yeniden bağlanma olurdu. SSE hiç kurulamazsa 3 saniyelik yoklamaya düşülüyor.
4. **`.zip` kontrolü büyük/küçük harfe duyarlı** (`file.filename.endswith(".zip")`), yani
   `VERI.ZIP` backend tarafından reddedilir. Arayüz duyarsız kontrol yapıp backend'in hata
   mesajını gösterir.
5. **`TripResponse` / `StopTimeResponse` şemalarında `trip_id`, `route_id`, `service_id` alanları
   `int`, ama veritabanı kolonları `String`.** GTFS dosyasındaki id'ler sayısal değilse
   (`"AB1"` gibi) bu uçlar 500 (ResponseValidationError) döndürür. Arayüz hatayı okunur biçimde
   gösteriyor ama kalıcı çözüm için şemadaki tiplerin `str` yapılması gerekir.
6. Kısmi güncellemede backend `None` gelen alanları yok sayıyor, dolayısıyla bir alanı `null`
   yapmak mümkün değil. Düzenleme formu sayısal alanların boş bırakılmasına izin vermiyor.
