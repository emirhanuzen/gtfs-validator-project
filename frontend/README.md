# GTFS Doğrulama Paneli — Frontend

GTFS doğrulama servisinin (FastAPI + Celery + RabbitMQ + PostgreSQL + MinIO + Redis) web arayüzü.
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
| `/`              | Parçalı (resumable) ZIP yükleme + tüm içe aktarmaların tablosu               |
| `/imports/:id`   | Tek bir içe aktarmanın canlı durumu + GTFS verisi sekmeleri                  |

## Parçalı (resumable) yükleme

Ana sayfadaki yükleme alanı artık dosyayı tek istekte göndermiyor; **5 MB'lık parçalara** bölüp
sırayla yüklüyor. Bağlantı koparsa gönderilmiş parçalar sunucuda kalıyor ve yükleme kaldığı yerden
devam ediyor.

### Akış

```
dosya seçilir
  └─ POST /import_gtfs/uploads/init?filename=&total_chunks=      -> { session_id }
     session_id localStorage'a yazılır  (anahtar: "gtfs.upload.pending")
  └─ her parça için, SIRAYLA (1'den total_chunks'a):
       POST /import_gtfs/uploads/{id}/chunk/{n}   (multipart, alan adı: "file")
       -> { received_chunks, total_chunks }        → ilerleme çubuğu güncellenir
  └─ POST /import_gtfs/uploads/{id}/complete       -> içe aktarma kaydı
     localStorage temizlenir, kullanıcı /imports/{id} sayfasına yönlendirilir

hata olursa (ağ hatası / zaman aşımı)
  └─ "Yükleme durdu" kartı + "Devam et" düğmesi
  └─ Devam et:
       GET /import_gtfs/uploads/{id}/status        -> { received_chunks, ... }
       listede olmayan parça numaraları gönderilir
       404 gelirse: localStorage temizlenir, "oturum süresi doldu" uyarısı gösterilir
```

### İlerleme göstergesi

- Parça isteği `fetch` yerine **XHR** ile atılıyor; yalnız XHR `upload.onprogress` verdiği için
  parça *içindeki* bayt ilerlemesi de biliniyor. Buna gerek var: 5 MB'tan küçük dosyalar tek
  parça olduğundan sadece parça sayısına bakan bir çubuk 0'dan 100'e tek adımda sıçrardı.
- Çubuğun yüzdesi `(onaylanan parça + o an giden parçanın oranı) / toplam parça`. Giden parça
  backend onaylayana kadar en fazla %99'una sayılıyor, yani "%100 · 0/1 parça yüklendi" gibi
  çelişkili bir görüntü çıkmıyor.
- Alt metin özellikle `received_chunks` üzerinden yazılıyor: "X/Y parça yüklendi" her zaman
  backend'in onayladığı parça sayısını gösterir.
- Yükleme bitince kart ~1,4 saniye "%100 · Tamamlandı" halinde kalıyor, ardından detay
  sayfasına geçiliyor (`DONE_HOLD_MS`); aksi halde hızlı bağlantıda gösterge göz kırpıp
  kayboluyordu.
- Kart, dosya seçilir seçilmez (init cevabı beklenmeden) görünüyor ve yükleme sürerken
  çubukta kayan çizgi deseni dönüyor.

### Bağlantı koptuğunda

- **Durma (stall) dedektörü:** parça isteği 10 saniye boyunca tek bayt ilerletemezse iptal edilir.
  Sabit bir toplam süre sınırı yerine bunun kullanılması önemli — yavaş ama çalışan bir bağlantıda
  5 MB'lık parça dakikalar sürebilir, kısa bir toplam sınır bunu haksız yere keserdi.
- **Anında tepki:** `window` üzerindeki `offline` olayı dinleniyor; tarayıcı çevrimdışına düşerse
  bekleyen parça `AbortController` ile hemen iptal edilir, 10 saniye beklenmez.
- `init`, `status` ve `complete` çağrılarının da artık üst sınırı var; eskiden bunlar zaman aşımsız
  `fetch` olduğu için bağlantı koptuğunda arayüz süresiz asılı kalabiliyordu.
- Hata anında kart amber'a döner ve "**Yükleme durdu — devam etmek için tıklayın**" başlıklı,
  içinde **Devam et** / **Vazgeç** düğmeleri olan bir uyarı çıkar (`role="alert"`).
- Yarım kalan parça sunucuda saklanmaz: kopmadan önce %60'ı gitmiş bir parça, devam edilince
  baştan gönderilir. Kurtarma çözünürlüğü `CHUNK_SIZE` kadardır.

### Konsol günlüğü

Akışın her adımı DevTools > Console'a `[upload]` ön ekiyle yazılıyor:

```
[upload] "veri.zip" (12.0 MB) 3 parçaya bölündü, init çağrılıyor…
[upload] ✓ session açıldı: 15a80203f8d54b4d8bc9b5fba45517e0
[upload] localStorage["gtfs.upload.pending"] yazıldı  {sessionId: …, filename: …, totalChunks: 3}
[upload] parça 1/3 gönderiliyor (5.0 MB)
[upload] ✓ parça 1/3 yüklendi (5.0 MB, 8.1 sn) — sunucuda 1/3 parça var
[upload] tarayıcı çevrimdışı oldu, bekleyen parça iptal ediliyor
[upload] ✗ yükleme durdu: İnternet bağlantısı kesildi.
[upload] devam etmek için karttaki "Devam et" düğmesine basın
[upload] devam ediliyor, status sorgulanıyor: 15a80203f8d5…
[upload] ✓ status: 1/3 parça sunucuda — eksikler: [2, 3]
```

### Kopan bağlantı nasıl test edilir?

> **Dikkat:** backend `http://localhost:8000` adresinde, yani **loopback**. Wi-Fi'ı ya da ağ
> kartını kapatmak localhost trafiğini etkilemez; yükleme kesintisiz sürer ve hiçbir hata
> görmezsiniz. Kesintiyi tarayıcı ya da sunucu tarafında oluşturmak gerekir:

1. **DevTools > Network > Throttling > Offline** — tarayıcı katmanında keser, localhost dahil.
   `offline` olayı da tetiklendiği için uyarı anında çıkar.
2. **API'yi durdurun:** `docker stop gtfs-validation-project-api-1` (geri açmak için `docker start …`).
   Bu durumda uyarı, durma dedektörüyle ~10 saniye içinde çıkar.
3. Yavaş bağlantıyı görmek için DevTools > Network > Throttling > "Slow 4G" da kullanılabilir.

`localStorage`'daki kayıt **DevTools > Application > Local Storage > http://localhost:5173**
altında `gtfs.upload.pending` anahtarında durur:

```json
{
  "sessionId": "15a80203f8d54b4d8bc9b5fba45517e0",
  "filename": "veri.zip",
  "totalChunks": 3,
  "fileSize": 12582912,
  "startedAt": 1787320111817
}
```

### Neden sırayla?

Backend `received_chunks` listesini Redis'te "oku → değiştir → yaz" biçiminde güncelliyor
(`app/services/upload_session.py`). Paralel gönderilen parçalar birbirinin kaydını ezip
`complete` aşamasında "eksik parça" hatasına yol açardı, o yüzden parçalar tek tek gidiyor.

### Sayfa yenilenirse ne oluyor?

`session_id`, dosya adı, toplam parça sayısı ve başlangıç zamanı `localStorage`'da duruyor;
sayfa kapatılsa bile kayboluyor değil. Ancak tarayıcı `File` nesnesini saklayamadığı için
devam etmeden önce **aynı dosyanın yeniden seçilmesi** gerekiyor. Arayüz bunu "Dosyayı seçip
devam et" düğmesiyle istiyor ve seçilen dosyanın adı ile parça sayısı oturumla uyuşmuyorsa
uyarı veriyor (yanlış dosyanın parçalarının birleştirilmesini engellemek için).

### Oturum ömrü

Upload session'lar Redis'te **30 dakika** TTL ile tutuluyor. Süre dolduğunda `/status` 404
döner; arayüz `localStorage`'ı temizleyip "oturum süresi doldu, baştan başlamanız gerekiyor"
uyarısını gösterir. Kayıtta tutulan başlangıç zamanı sayesinde istek atmadan da süresi dolmuş
oturumlar eleniyor, ayrıca kartta "yaklaşık N dk sonra sona erer" bilgisi yazıyor.

### Ayarlar

`src/lib/upload.js` içindeki sabitler:

| Sabit                       | Varsayılan | Açıklama                                                          |
| --------------------------- | ---------- | ----------------------------------------------------------------- |
| `CHUNK_SIZE`                | 5 MB       | Parça boyutu; kopan bağlantıda kaybedilen iş miktarını belirler    |
| `CHUNK_STALL_TIMEOUT_MS`    | 10 sn      | Bu süre boyunca hiç bayt ilerlemezse istek iptal edilir            |
| `CHUNK_RESPONSE_TIMEOUT_MS` | 30 sn      | Gövde gitti ama sunucudan yanıt yoksa beklenecek süre              |
| `CHUNK_TIMEOUT_MS`          | 120 sn     | Tek bir parça isteğinin mutlak üst sınırı (`xhr.timeout`)          |
| `REQUEST_TIMEOUT_MS`        | 15 sn      | `init` ve `status` istekleri için üst sınır                        |
| `COMPLETE_TIMEOUT_MS`       | 90 sn      | `complete` (birleştirme + sağlama + MinIO) için üst sınır          |
| `UPLOAD_SESSION_TTL_MS`     | 30 dk      | Backend'deki Redis TTL'inin istemci tarafındaki karşılığı          |

`CHUNK_SIZE`'ı değiştirirseniz o an localStorage'da duran yarım yüklemeler artık devam
ettirilemez (parça sayısı tutmayacağı için arayüz uyarı verip yeni yükleme ister) — sorun
çıkarmaz, sadece o bir dosya baştan yüklenir.

> Tek istekte yükleme yapan klasik `POST /import_gtfs/` ucu backend'de duruyor ve
> `api.uploadImport()` olarak hâlâ erişilebilir; arayüz artık her boyuttaki dosya için
> parçalı akışı kullanıyor.

### Ana sayfa

- ZIP dosyası sürükle-bırak ya da tıklayarak seçilir, yukarıdaki parçalı akışla yüklenir.
- İlerleme çubuğu yüzdeyi, "X/Y parça yüklendi" alt metnini ve oturum bilgisini gösterir.
- Yükleme sırasında "Duraklat", durduğunda "Devam et" / "Vazgeç" düğmeleri çıkar.
- Tabloda id, dosya adı, durum rozeti, oluşturulma tarihi ve işlem düğmeleri var.
- Listede tamamlanmamış bir kayıt varsa liste 3 saniyede bir sessizce tazelenir.

### Detay sayfası

- Durum `GET /import_gtfs/{id}/stream` (SSE) ile canlı izlenir; sayfa yenilemeye gerek yok.
- İşlem bittiğinde tam kayıt tekrar çekilir ve veri sekmeleri yeniden yüklenir.
- Sekmeler: hatlar (routes), duraklar (stops), seferler (trips), kurum (agency),
  durak saatleri (stop_times).
- **stop_times sayfalanıyor:** istek `?limit=100&offset=<sayfa*100>` ile atılır, "Önceki /
  Sonraki" denetimi tablonun **hem üstünde hem altında** durur (100 satırlık tabloda sadece
  alttaki denetim ekranın çok aşağısında kalıyordu). Denetimde "1–100 arası kayıt · sayfa 1 ·
  sayfa başına 100" bilgisi de yazar. Dönen satır sayısı `limit`ten azsa "Sonraki" pasifleşir —
  backend toplam kayıt sayısını döndürmediği için son sayfa ancak böyle anlaşılıyor.
  Sayfa boyutu `src/lib/resources.js` içindeki `pageSize` ile değişir.
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

## Tasarım

- Renkler `src/index.css` içindeki `@theme` bloğunda tanımlı. Mavi/gri çizgi korundu, marka
  mavisi biraz daha canlı bir tona çekilip `brand-50…950` ölçeği olarak açıldı; bileşenler
  `blue-*` yerine `brand-*` kullanıyor. Tek yerden renk değiştirmek için burayı düzenleyin.
- Yazı tipi Inter (Google Fonts, `index.html`); yüklenemezse sistem yazı tipine düşer.
- Kartlar/tablolar `shadow-card`, modal `shadow-pop` gölge tokenlarını kullanıyor (yine `@theme`).
- Boş durumlar ortak `EmptyState` bileşeniyle çiziliyor (ikon rozeti + başlık + açıklama).
- `prefers-reduced-motion` açıkken geçişler ve animasyonlar kapatılıyor.

## Klasör yapısı

```
src/
  api/client.js               fetch sarmalayıcısı, ApiError, tüm uç noktalar
  hooks/useImportStream.js    SSE ile canlı durum takibi (+ yedek yoklama)
  hooks/useResumableUpload.js parçalı yükleme durum makinesi (init/chunk/status/complete)
  lib/upload.js               parça boyutu, dilimleme, localStorage yardımcıları
  lib/status.js               durum etiketleri/renkleri ve iş kuralları
  lib/resources.js            sekmelerin kolon ve düzenlenebilir alan tanımları
  lib/format.js               tarih/hücre biçimlendirme
  components/                 UploadPanel, UploadDropzone, ProgressBar, EmptyState,
                              StatusBadge, ResourcePanel, EditModal, ...
  pages/                      ImportListPage, ImportDetailPage
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
7. **`POST /uploads/{id}/complete` boş gövde (`{}`) döndürüyor.** Ucun `response_model`'i yok ve
   `db.commit()` sonrası expire olmuş ORM nesnesi serileştirildiği için gövde boş kalıyor —
   içe aktarma kaydı aslında oluşuyor. Arayüz bu durumda `GET /import_gtfs/` listesinden aynı
   dosya adına sahip en yeni kaydı bulup ona yönleniyor. Backend tarafında
   `@router.post(..., response_model=ImportResponse)` eklenip `db.refresh(db_import)`
   çağrılırsa bu geçici çözüme gerek kalmaz.
8. **`/uploads/init` parametreleri query string'de** (`filename`, `total_chunks`), gövdede değil.
   `.zip` uzantı kontrolü bu uçta yapılmıyor; arayüz kontrolü kendisi yapıyor.
