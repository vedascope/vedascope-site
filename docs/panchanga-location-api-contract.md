# Panchanga location API contract

Дата: 2026-06-18.

Этот документ фиксирует целевой переиспользуемый контракт панчанги vedascope для web, mobile app, Telegram WebApp, PWA, widget, Sky Clock, SVG/PNG export и daily post generator.

## Location object

Frontend и backend должны работать не с одной строкой `city`, а с объектом локации:

```json
{
  "id": "seed:moscow-ru",
  "name": "Москва",
  "country": "Россия",
  "region": "Москва",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "timezone": "Europe/Moscow",
  "source": "seed"
}
```

Обязательные поля для расчета:

- `latitude`;
- `longitude`;
- `timezone` в формате IANA.

`name`, `country`, `region`, `id`, `source` нужны для UI, диагностики, кеша и будущей замены seed list на GeoNames.

## Seed list

Первый этап без полной GeoNames-базы использует seed-файл:

- `data/locations.seed.json`.

Сейчас в нем есть:

- Москва;
- Санкт-Петербург;
- Амстердам;
- Нью-Йорк;
- Владивосток;
- Рощино;
- Дели;
- Лондон.

Этот файл должен быть заменяемым источником данных. В будущем backend endpoint `/api/locations/search` должен читать индекс GeoNames или кешированную таблицу, но возвращать тот же shape.

## `/api/locations/search`

Целевой endpoint:

```http
GET /api/locations/search?q=мос
```

Response:

```json
[
  {
    "id": "seed:moscow-ru",
    "name": "Москва",
    "country": "Россия",
    "region": "Москва",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow",
    "source": "seed"
  }
]
```

Требования:

- искать по `name` и `aliases`;
- принимать русские и английские варианты;
- возвращать небольшой список, например 8-10 элементов;
- ранжировать точные совпадения выше prefix/contains;
- не дергать внешний geocoder из browser на каждый ввод;
- позже заменить seed на GeoNames без изменения response shape.

Текущее состояние репозитория: frontend уже пробует `/api/locations/search`, но если production backend еще не имеет endpoint, использует `data/locations.seed.json` как fallback. Backend-код этого endpoint отсутствует в текущей рабочей копии.

## `/api/panchanga`

Новый предпочтительный контракт:

```http
GET /api/panchanga?date=2026-06-18&time=09:00&lat=55.7558&lon=37.6173&tz=Europe/Moscow
```

Временная совместимость с текущим production backend:

```http
GET /api/panchanga?year=2026&month=6&day=18&hour=9&minute=0&latitude=55.7558&longitude=37.6173&timezone=3&tz=Europe/Moscow
```

Правила backend:

- использовать `lat/lon/tz` как предпочтительные параметры;
- поддерживать старые `latitude/longitude/timezone` до завершения миграции;
- если `tz` IANA передан, вычислять UTC offset для конкретной даты через `zoneinfo` или эквивалент;
- numeric `timezone` оставить только как fallback;
- не делать скрытый fallback на Москву при city-only input;
- если fallback на default location допустим, response должен явно содержать `used_default: true`.

Рекомендуемый response context:

```json
{
  "date": "2026-06-18",
  "calculation_time_local": "09:00",
  "input": {
    "date": "2026-06-18",
    "time": "09:00",
    "timezone": "Europe/Moscow",
    "utc": "2026-06-18T06:00:00Z"
  },
  "location": {
    "name": "Москва",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow",
    "utc_offset": 3,
    "used_default": false
  }
}
```

Deprecated:

- расчет только по `city`;
- скрытый default на Москву без `used_default`;
- timezone как единственный numeric offset в долгосрочном контракте.

## `/api/grahas`

Минимально обязательный новый JSON endpoint для будущих клиентов:

```http
GET /api/grahas?date=2026-06-18&time=09:00&lat=55.7558&lon=37.6173&tz=Europe/Moscow
```

Response:

```json
{
  "datetime": {
    "date": "2026-06-18",
    "time": "09:00",
    "timezone": "Europe/Moscow",
    "utc": "2026-06-18T06:00:00Z"
  },
  "location": {
    "name": "Москва",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow",
    "used_default": false
  },
  "ayanamsa": "Lahiri",
  "grahas": [
    {
      "key": "sun",
      "name": "Sun",
      "longitude": 59.0,
      "signIndex": 1,
      "degreeInSign": 29.0,
      "nakshatraIndex": 4,
      "padaIndex": 17
    }
  ]
}
```

`/api/grahas` не должен возвращать HTML или SVG. Он нужен для mobile, widgets, Telegram, Sky Clock и генераторов публикаций.

Текущее состояние: production `/api/grahas` возвращает 404, backend implementation отсутствует в текущей рабочей копии.

## `/api/chart`

Целевой JSON endpoint:

```http
GET /api/chart?date=2026-06-18&time=09:00&lat=55.7558&lon=37.6173&tz=Europe/Moscow
```

Response должен включать:

- `lagna`;
- houses/signs;
- grahas placements;
- calculation settings;
- normalized `location`;
- normalized datetime context.

Этот endpoint нужен клиентам, которым не нужен SVG.

Текущее состояние: production `/api/chart` возвращает 404.

## `/chart/svg`

Целевой render endpoint:

```http
GET /chart/svg?date=2026-06-18&time=09:00&lat=55.7558&lon=37.6173&tz=Europe/Moscow&style=south
```

Он может использовать тот же calculation core, что `/api/chart`, но возвращать `image/svg+xml`.

Текущее состояние: страница `/panchanga` продолжает использовать `/api/full/html` для SVG, чтобы не ломать production.

## `/api/sky-clock/state`

Целевой endpoint:

```http
GET /api/sky-clock/state?date=2026-06-18&time=09:00&lat=55.7558&lon=37.6173&tz=Europe/Moscow
```

Response должен быть JSON-state без HTML:

- datetime;
- location;
- ayanamsa;
- longitudes всех grahas;
- chart/lagna basics;
- calculation settings.

Sky Clock, widgets и export должны использовать этот endpoint, а не парсить `/api/full/html`.

## Frontend behavior

Страница `/panchanga` должна:

- хранить выбранный город как location object;
- искать локации через `/api/locations/search`;
- временно fallback на `data/locations.seed.json`, пока backend endpoint не развернут;
- отправлять в расчет `lat`, `lon`, `tz`;
- для текущего production backend также отправлять `latitude`, `longitude`, numeric `timezone`, `year/month/day/hour/minute`;
- не отправлять только `city` как основной расчетный параметр.

Если пользователь ввел текст, но не выбрал location object, frontend должен попытаться найти точное совпадение в location search. Если точного совпадения нет, нужно показать validation error и не делать расчет по старым координатам.

Advanced/manual location mode в этой итерации не включен в UI, потому что требует отдельной валидации координат и timezone. Следующий безопасный шаг:

- раскрываемая секция advanced;
- `latitude`;
- `longitude`;
- `timezone` IANA;
- явная кнопка "Использовать координаты";
- validation перед расчетом.

## Timezone

Целевой формат: IANA timezone string.

Backend должен:

- принимать `tz=Europe/Moscow`;
- вычислять UTC offset на дату расчета;
- учитывать DST для `Europe/Amsterdam`, `Europe/London`, `America/New_York`;
- использовать `zoneinfo` в Python/FastAPI или аналогичную стандартную библиотеку.

Numeric `timezone` остается временным fallback для старых клиентов.

## Validation/default behavior

Правило безопасности:

```text
city-only input без lat/lon/tz не должен молча считаться по Москве.
```

Допустимые варианты:

- вернуть validation error;
- использовать default location только для явного default mode;
- вернуть `used_default: true` в response.

## Client usage

Web browser:

- autocomplete через `/api/locations/search`;
- `/api/panchanga` для панчанги;
- `/api/full/html` временно для карты до появления `/chart/svg`.

Mobile app / Telegram WebApp / PWA:

- `/api/locations/search`;
- `/api/panchanga`;
- `/api/grahas`;
- `/api/chart`.

Mobile widget / daily post generator:

- `/api/panchanga`;
- `/api/grahas`;
- optional `/chart/svg`.

Sky Clock:

- `/api/sky-clock/state`;
- later `/api/sky-clock/snapshot.svg`;
- later `/api/sky-clock/snapshot.png`.

## Backend implementation checklist

В текущем статическом репозитории backend-код отсутствует. На backend/VPS нужно реализовать:

1. `/api/locations/search` на seed list или GeoNames-compatible repository.
2. IANA `tz` parsing in `/api/panchanga`.
3. No hidden city-only default to Moscow.
4. Response context `input` and `location.used_default`.
5. `/api/grahas` JSON.
6. `/api/chart` JSON.
7. Optional `/chart/svg`.
8. Optional `/api/sky-clock/state`.
