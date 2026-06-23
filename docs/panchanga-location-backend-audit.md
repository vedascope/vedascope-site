# Аудит location/backend flow панчанги vedascope

Дата аудита: 2026-06-18.

## 1. Current frontend flow

Текущая frontend-страница панчанги находится в `panchanga/index.html`.

Форма расчета находится в этом же файле:

- `panchanga/index.html:182` - `<form class="panchanga-form" data-panchanga-form>`;
- `panchanga/index.html:183` - поле даты `date`;
- `panchanga/index.html:184` - поле времени `time`;
- `panchanga/index.html:185` - поле города `city`.

Поле города сейчас является обычным текстовым input:

```html
<input id="city" name="city" type="text" value="Москва" autocomplete="address-level2">
```

Это не полноценный autocomplete: нет выпадающего списка вариантов, нет выбора стабильного `location.id`, нет видимого объекта локации. При этом код все же пытается превратить введенный город в координаты и часовой пояс перед запросом в backend.

State локации хранится в inline script:

- `DEFAULT_LOCATION` - Москва: `55.7558`, `37.6173`, `timezone: "3"`;
- `activeLocation` - текущая выбранная/разрешенная локация;
- `lastResolvedCity` - последний успешно разрешенный город;
- `CITY_FALLBACKS` - небольшой hardcoded список городов.

Список `CITY_FALLBACKS` находится в `panchanga/index.html:243-254`. В нем есть Москва, Санкт-Петербург, Чебоксары, Казань, Нижний Новгород, Екатеринбург, Новосибирск, Сочи, London, Delhi. Amsterdam, New York и Владивосток в hardcoded list отсутствуют.

Если город найден в `CITY_FALLBACKS`, frontend берет оттуда `city`, `latitude`, `longitude`, `timezone`. Если не найден, frontend обращается напрямую из браузера к:

- `https://nominatim.openstreetmap.org/search` для координат;
- `https://timeapi.io/api/TimeZone/coordinate` для текущего UTC offset.

Если `timeapi.io` не отвечает, frontend оценивает offset грубо по долготе:

```js
Math.round(Number(longitude) / 15)
```

После резолва `queryFromForm()` отправляет в backend:

- `year`;
- `month`;
- `day`;
- `hour`;
- `minute`;
- `timezone`;
- `latitude`;
- `longitude`;
- `city`;
- `chart_style`.

Запросы из frontend:

- `/api/panchanga?...` - JSON панчанги;
- `/api/full/html?...` - HTML, из которого frontend вырезает SVG-карты `[data-chart-style]`.

URL в адресной строке намеренно сохраняет только `year`, `month`, `day`, `hour`, `minute`, `city`. Координаты и timezone в visible URL не сохраняются. После reload город снова резолвится через frontend.

## 2. Current backend/API flow

В этой рабочей копии репозитория нет backend-кода расчета: нет Python/Node backend-файлов, нет `package.json`, `pyproject.toml`, `requirements.txt`, API routes или server app. В репозитории присутствует статическая страница `panchanga/index.html`, которая вызывает production backend по относительным URL.

Production-проверка `https://vedascope.ru` показала:

- `GET /api/panchanga` существует и возвращает чистый JSON;
- `GET /api/full/html` существует и возвращает HTML с двумя SVG-картами, south/north;
- `GET /api/chart` возвращает 404;
- `GET /chart/svg` возвращает 404;
- `GET /api/grahas` возвращает 404.

`/api/panchanga` принимает и реально отражает в ответе `timezone`, `latitude`, `longitude`. Если эти параметры не передать, backend использует дефолт:

```json
{
  "timezone": 3.0,
  "latitude": 55.7558,
  "longitude": 37.6173
}
```

Проверка `GET /api/panchanga?year=2026&month=6&day=18&hour=9&minute=0&city=New%20York` вернула дефолтную Москву. Значит backend сейчас не резолвит `city` в координаты/timezone. Название города само по себе для расчета не используется как location source.

Backend возвращает `calculation_time_local`, то есть получает локальное время и numeric timezone offset, а не IANA timezone string. Где именно происходит перевод local time + offset в UTC/Julian Day, в этой рабочей копии проверить нельзя: backend-код отсутствует в репозитории.

## 3. City selection problem

Короткий вывод: город сейчас не является надежным backend location object.

Что работает:

- frontend перед расчетом обычно отправляет `latitude`, `longitude`, `timezone`;
- для городов из `CITY_FALLBACKS` координаты меняются без внешнего API;
- для остальных городов frontend пытается получить координаты через Nominatim;
- `/api/panchanga` действительно использует переданные numeric `timezone`, `latitude`, `longitude`;
- `/api/full/html` также использует переданные параметры для SVG-карты.

Что проблемно:

- поле города - простой текстовый input, не autocomplete;
- пользователь не выбирает конкретный объект из списка, поэтому возможен неверный первый результат Nominatim;
- нет `location.id`, страны, региона, source, confidence;
- timezone хранится как numeric offset, не как IANA string (`Europe/Moscow`, `Europe/Amsterdam`, `America/New_York`);
- offset берется на текущий момент, а не обязательно на дату расчета;
- fallback offset по долготе не учитывает политические timezone и daylight saving time;
- Nominatim и timeapi.io вызываются напрямую из frontend, без backend cache, rate limiting и контроля attribution;
- если frontend не смог зарезолвить город, backend silently падает на Москву, если lat/lon/tz не переданы;
- visible URL содержит только `city`, поэтому воспроизводимость расчета зависит от повторного frontend-resolve.

Главный баг/риск: UI может показывать новое название города, но при отсутствии `latitude`, `longitude`, `timezone` backend считает по дефолтной Москве. Это уже подтверждено прямым запросом с `city=New York` без координат.

Почему лагна может не меняться:

- если в API ушел только `city`, backend использует дефолтные координаты Москвы;
- если Nominatim/timeapi.io недоступны, расчет не получает надежный timezone;
- если timezone передан как округленный offset по долготе, локальное время может быть смещено;
- если пользователь меняет URL вручную и оставляет только `city`, координаты не сохраняются;
- если разные города дают одно и то же положение ascendant в конкретный момент, это может быть нормальным астрономическим совпадением, но без явного location object это трудно отлаживать.

## 4. Network/API scenarios

Проверены production API-запросы на `https://vedascope.ru` для даты 2026-06-18 и local time 09:00.

| Сценарий | Отправлено в API | Backend location | Moon longitude | Nakshatra | Tithi end | Sunrise/Sunset | Lagna в SVG |
|---|---|---|---:|---|---|---|---|
| Москва | `timezone=3`, `latitude=55.7558`, `longitude=37.6173` | 55.7558, 37.6173, UTC+3 | 106.6404 | Pushya | 16:29 | 03:43 / 21:17 | `As` в знаке 1, около 29' |
| Amsterdam | `timezone=2`, `latitude=52.3676`, `longitude=4.9041` | 52.3676, 4.9041, UTC+2 | 107.2398 | Ashlesha | 15:29 | 05:17 / 22:05 | `As` в знаке 1, около 15' |
| New York | `timezone=-4`, `latitude=40.7128`, `longitude=-74.0060` | 40.7128, -74.006, UTC-4 | 110.8196 | Ashlesha | 09:29 | 05:24 / 20:30 | `As` в знаке 1, около 17' |
| Владивосток | `timezone=10`, `latitude=43.1155`, `longitude=131.8855` | 43.1155, 131.8855, UTC+10 | 102.4224 | Pushya | 23:29 | 05:32 / 20:54 | `As` в знаке 1, около 14' |

Контрольный запрос Москва 18:00 показал, что lagna в SVG меняется: `As` перешел в знак 7, около 28'. Значит механизм карты реагирует на время. В четырех сценариях 09:00 ascendant оказался в одном знаке, но с разными градусами; это стоит отдельно проверить в backend-тестах после доступа к расчетному коду.

## 5. Calculation flow observations

По production-ответам видно:

- local date/time принимаются раздельно как `year/month/day/hour/minute`;
- timezone принимается как numeric offset (`3`, `2`, `-4`, `10`), а не IANA timezone;
- `latitude` и `longitude` влияют на sunrise/sunset;
- `timezone` влияет на переходы титхи/накшатры и longitudes, потому что 09:00 local в разных timezone означает разный UTC момент;
- `/api/panchanga` не возвращает список всех grahas и lagna;
- lagna доступна только косвенно через SVG в `/api/full/html`;
- chart render и calculation JSON сейчас не разделены чисто.

Риск daylight saving time высокий: numeric offset не позволяет backend самостоятельно определить offset для конкретной даты. Например, `Europe/Amsterdam` летом UTC+2, зимой UTC+1. Если frontend сохранит только `timezone=2`, расчет для зимней даты может быть неверным.

## 6. Multi-environment readiness

Текущий backend частично готов для web/browser:

- `/api/panchanga` возвращает чистый JSON;
- endpoint можно вызвать напрямую;
- frontend уже отделяет JSON панчанги от HTML/SVG карты.

Но для mobile app, Telegram WebApp, PWA, mobile widget, daily post generator, Sky Clock и SVG/PNG export архитектура пока недостаточно разделена.

Не хватает:

- `/api/locations/search` для autocomplete;
- `/api/locations/resolve` для стабильного location object;
- `/api/chart` как чистый JSON карты;
- `/api/grahas` как отдельный JSON endpoint положений грах;
- `/api/nabhasa/state` с longitudes всех грах, date/time, timezone, location, ayanamsa, settings;
- `/api/nabhasa/snapshot.svg`;
- `/api/nabhasa/snapshot.png`;
- разделения calculation JSON и visual render/export;
- единых calculation settings в ответе: ayanamsa, zodiac, house system/chart style, timezone source.

Сейчас `/api/full/html` полезен для web-страницы, но это не core-service контракт. Mobile/widget/Sky Clock не должны парсить HTML, чтобы получить данные карты или grahas.

## 7. Location database options

### GeoNames local database

Подходящие наборы:

- `cities1000` - города/населенные пункты от 1000 жителей;
- `cities5000` - более легкий старт для autocomplete крупных городов;
- `allCountries` - полный набор, тяжелее для импорта и поиска.

Нужные поля:

- geoname id;
- city name;
- country code/name;
- admin1/admin2 region;
- latitude;
- longitude;
- timezone;
- population;
- alternate names;
- feature class/code.

Плюсы:

- независимость от внешнего API;
- быстрый backend search;
- можно хранить на своем сервере;
- хорошо подходит для стратегии собственной инфраструктуры vedascope;
- можно версионировать импорт и строить стабильные `location.id`.

Минусы:

- нужен import pipeline;
- нужен индекс поиска;
- нужны обновления;
- нужно аккуратно работать с duplicate names и alternate names;
- русский/английский поиск потребует нормализации и ранжирования.

Рекомендация по хранению: PostgreSQL + trigram/full-text indexes или SQLite/FTS для первого этапа. Ранжирование: точное совпадение, prefix match, страна/язык пользователя, population, административный ранг.

### OpenStreetMap/Nominatim

Публичный Nominatim можно использовать для редких fallback-поисков, но не как тяжелый production autocomplete на каждый ввод символа.

Риски:

- rate limits и usage policy;
- требования attribution;
- нельзя безопасно дергать напрямую из frontend как основной search;
- нужен backend proxy, debounce, cache, throttling;
- результаты могут быть неоднозначными.

### Google Geocoding + Time Zone API

Плюсы:

- высокое качество данных;
- хороший geocoding и timezone по координатам/timestamp;
- понятные API.

Минусы:

- стоимость;
- API keys и billing;
- vendor lock-in;
- зависимость от внешнего сервиса;
- не лучший базовый слой, если vedascope хочет независимую инфраструктуру.

### Hybrid

Рекомендуемый путь:

- основа: локальная GeoNames-база;
- fallback: Nominatim или Google для редких мест;
- все fallback-результаты кешировать локально;
- timezone хранить как IANA string;
- offset вычислять на backend для конкретной даты;
- advanced manual mode для координат/timezone.

## 8. Recommended target architecture

Целевой flow:

1. Пользователь вводит 2-3 символа города.
2. Frontend вызывает `/api/locations/search?q=мос`.
3. Backend ищет в локальной базе и возвращает список location objects.
4. Пользователь выбирает конкретную локацию.
5. Frontend хранит весь location object, а не только строку города.
6. Frontend вызывает calculation endpoints с `date`, `time`, `latitude`, `longitude`, `timezone`.
7. Backend сам переводит local datetime + IANA timezone в UTC/JD.

Пример ответа `/api/locations/search`:

```json
[
  {
    "id": "geonames:524901",
    "name": "Москва",
    "country": "Россия",
    "region": "Москва",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow",
    "population": 13000000,
    "source": "geonames"
  }
]
```

Пример запроса расчета:

```http
GET /api/panchanga?date=2026-06-18&time=09:00&lat=55.7558&lon=37.6173&tz=Europe/Moscow
```

Или body JSON:

```json
{
  "date": "2026-06-18",
  "time": "09:00",
  "location": {
    "id": "geonames:524901",
    "name": "Москва",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow"
  }
}
```

Backend должен возвращать в response normalized calculation context:

```json
{
  "input": {
    "date": "2026-06-18",
    "time": "09:00",
    "timezone": "Europe/Moscow",
    "utc": "2026-06-18T06:00:00Z",
    "location": {
      "latitude": 55.7558,
      "longitude": 37.6173
    }
  },
  "settings": {
    "ayanamsa": "lahiri"
  }
}
```

## 9. Implementation plan

Этап 1. Исправить текущую форму, чтобы она явно отправляла lat/lon/timezone и показывала, что именно выбрано. Минимально - сохранить hidden fields или frontend state с `latitude`, `longitude`, `timezone`.

Этап 2. Добавить backend endpoint `/api/locations/search`.

Этап 3. Подключить временный источник городов: небольшой локальный seed list, GeoNames sample или backend geocoder cache.

Этап 4. Добавить autocomplete на frontend. Не делать огромный `<select>`.

Этап 5. Добавить advanced manual location mode: latitude, longitude, timezone.

Этап 6. Добавить тесты на разные города, разные timezone, одинаковое local time, проверку изменения sunrise/sunset и lagna.

Этап 7. Добавить cache/fallback для внешних geocoder-запросов.

Этап 8. Импортировать полноценную GeoNames-базу и построить индексы поиска.

Этап 9. Разделить calculation endpoints и render/export endpoints:

- `/api/panchanga`;
- `/api/chart`;
- `/api/grahas`;
- `/api/nabhasa/state`;
- `/api/nabhasa/snapshot.svg`;
- `/api/nabhasa/snapshot.png`.

## 10. Files to change later

В текущей рабочей копии:

- `panchanga/index.html` - форма, city field, frontend location state, API calls;
- новый backend location service - отсутствует в этой рабочей копии;
- новый backend calculation service/API routes - отсутствует в этой рабочей копии;
- docs/tests - добавить после появления backend-кода в репозитории.

На production backend нужно найти и изменить:

- route `/api/panchanga`;
- route `/api/full/html`;
- расчет chart/lagna/grahas;
- timezone/local datetime conversion;
- default location handling;
- render layer SVG/HTML.

## 11. Acceptance status

Выполнено:

- описан текущий frontend flow;
- описан текущий backend/API flow по production-проверкам;
- найдено, какие параметры реально отправляет frontend;
- подтверждено, что backend использует `latitude`, `longitude`, numeric `timezone`;
- подтверждено, что backend не резолвит `city` без координат;
- объяснено, почему выбор города может не менять лагну;
- проверены четыре сценария Москва/Amsterdam/New York/Владивосток;
- сравнены GeoNames, Nominatim, Google, Hybrid;
- дана рекомендуемая architecture для vedascope;
- предложен пошаговый план внедрения.

Ограничение:

- backend source code отсутствует в этой рабочей копии, поэтому внутренние функции UTC/JD, grahas, lagna, sunrise/sunset найдены только по API-симптомам, а не по исходникам.
