/**
 * Detay sayfasındaki sekmelerin tanımı.
 *
 * Not: PUT/DELETE uçlarındaki yol parametresi GTFS'teki metinsel route_id/stop_id/trip_id
 * değil, veritabanı birincil anahtarı (satırdaki `id`) olduğu için mutasyonlarda `row.id`
 * gönderiyoruz.
 */
export const RESOURCES = [
  {
    key: "routes",
    label: "Hatlar",
    hint: "routes.txt",
    columns: [
      { key: "route_id", label: "route_id" },
      { key: "route_short_name", label: "Kısa ad" },
      { key: "route_long_name", label: "Uzun ad" },
      { key: "route_type", label: "Tip" },
    ],
    editableFields: [
      { name: "route_short_name", label: "Kısa ad", type: "text" },
      { name: "route_long_name", label: "Uzun ad", type: "text" },
      { name: "route_type", label: "Tip (route_type)", type: "integer" },
    ],
  },
  {
    key: "stops",
    label: "Duraklar",
    hint: "stops.txt",
    columns: [
      { key: "stop_id", label: "stop_id" },
      { key: "stop_name", label: "Durak adı" },
      { key: "stop_lat", label: "Enlem" },
      { key: "stop_lon", label: "Boylam" },
    ],
    editableFields: [
      { name: "stop_name", label: "Durak adı", type: "text" },
      { name: "stop_lat", label: "Enlem (stop_lat)", type: "number" },
      { name: "stop_lon", label: "Boylam (stop_lon)", type: "number" },
    ],
  },
  {
    key: "trips",
    label: "Seferler",
    hint: "trips.txt",
    columns: [
      { key: "trip_id", label: "trip_id" },
      { key: "route_id", label: "route_id" },
      { key: "service_id", label: "service_id" },
    ],
    editableFields: [
      { name: "route_id", label: "route_id", type: "text" },
      { name: "service_id", label: "service_id", type: "text" },
    ],
  },
  {
    key: "agency",
    label: "Kurum",
    hint: "agency.txt",
    columns: [
      { key: "agency_name", label: "Kurum adı" },
      { key: "agency_url", label: "Adres" },
      { key: "agency_timezone", label: "Saat dilimi" },
    ],
    editableFields: [],
  },
  {
    key: "stop_times",
    label: "Durak saatleri",
    hint: "stop_times.txt",
    paginated: true,
    pageSize: 100,
    columns: [
      { key: "trip_id", label: "trip_id" },
      { key: "stop_id", label: "stop_id" },
      { key: "stop_sequence", label: "Sıra" },
      { key: "arrival_time", label: "Varış" },
      { key: "departure_time", label: "Kalkış" },
    ],
    editableFields: [],
  },
];

export const isMutable = (resource) => resource.editableFields.length > 0;

export function getResource(key) {
  return RESOURCES.find((resource) => resource.key === key) ?? RESOURCES[0];
}
