# Аудит выбора города в панчанге vedascope

Дата аудита: 2026-06-18.

Полный backend/location аудит находится в `docs/panchanga-location-backend-audit.md`. Этот файл фиксирует короткий вывод именно по city selection.

## Текущее состояние

Страница панчанги находится в `panchanga/index.html`.

Форма:

- `panchanga/index.html:182` - форма `data-panchanga-form`;
- `panchanga/index.html:183` - дата;
- `panchanga/index.html:184` - время;
- `panchanga/index.html:185` - город.

Поле города сейчас обычное текстовое поле:

```html
<input id="city" name="city" type="text" value="Москва" autocomplete="address-level2">
```

Полноценного autocomplete и выпадающего списка нет. Пользователь не выбирает стабильный location object.

## Как город превращается в координаты

В `panchanga/index.html` есть frontend-only логика:

- `DEFAULT_LOCATION` - Москва, `55.7558`, `37.6173`, `timezone: "3"`;
- `CITY_FALLBACKS` - маленький hardcoded список городов;
- `resolveCityLocation()` - пытается найти город в fallback list или запросить Nominatim;
- `resolveTimezone()` - запрашивает numeric offset через `timeapi.io`;
- `estimateTimezoneFromLongitude()` - грубый fallback offset по долготе.

Если город найден, frontend отправляет в backend:

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

Основные запросы:

- `/api/panchanga?...`;
- `/api/full/html?...`.

## Главная проблема

Город сейчас не является backend-resolved entity. Backend не получает `location.id` и не делает надежную связку:

```text
city -> latitude -> longitude -> IANA timezone
```

Production-проверка показала: если вызвать `/api/panchanga` только с `city=New York`, но без `latitude`, `longitude`, `timezone`, backend использует дефолтную Москву:

```json
{
  "timezone": 3.0,
  "latitude": 55.7558,
  "longitude": 37.6173
}
```

Значит название города само по себе backend сейчас не использует для расчета.

## Проверочные сценарии

Проверены прямые production-запросы для `2026-06-18 09:00 local`.

| Город | Params | Backend использовал | Результат |
|---|---|---|---|
| Москва | `timezone=3`, `latitude=55.7558`, `longitude=37.6173` | Москва UTC+3 | Moon 106.6404, Pushya, sunrise 03:43 |
| Amsterdam | `timezone=2`, `latitude=52.3676`, `longitude=4.9041` | Amsterdam UTC+2 | Moon 107.2398, Ashlesha, sunrise 05:17 |
| New York | `timezone=-4`, `latitude=40.7128`, `longitude=-74.0060` | New York UTC-4 | Moon 110.8196, Ashlesha, sunrise 05:24 |
| Владивосток | `timezone=10`, `latitude=43.1155`, `longitude=131.8855` | Владивосток UTC+10 | Moon 102.4224, Pushya, sunrise 05:32 |

Вывод: когда lat/lon/timezone переданы, backend меняет расчет. Когда передано только название города, backend падает на дефолтную Москву.

## Риски

- UI может показывать новый город, а backend считать по старым или дефолтным координатам.
- Numeric timezone offset не учитывает DST и исторические/будущие изменения timezone.
- Frontend берет timezone offset на момент запроса, а не обязательно на дату расчета.
- Nominatim и timeapi.io вызываются напрямую из браузера.
- Нет backend cache, rate limiting и стабильного location source.
- Visible URL сохраняет только `city`, но не сохраняет lat/lon/timezone.
- Amsterdam, New York, Владивосток отсутствуют в hardcoded fallback list.

## Рекомендация

Для vedascope лучше строить location service:

```text
frontend autocomplete
-> /api/locations/search
-> backend local city database
-> selected location object
-> /api/panchanga with date, time, latitude, longitude, IANA timezone
```

Рекомендуемый источник:

- основа: локальная GeoNames-база;
- fallback: внешний geocoder через backend proxy;
- все fallback-результаты кешировать;
- timezone хранить как IANA string;
- offset вычислять на backend для конкретной даты.

## Минимальный план внедрения

1. Исправить текущую форму, чтобы она явно отправляла lat/lon/timezone.
2. Добавить `/api/locations/search`.
3. Подключить небольшой seed list или GeoNames sample.
4. Добавить autocomplete.
5. Добавить advanced manual location mode: latitude, longitude, timezone.
6. Добавить тесты на разные города, timezone и одинаковое local time.
7. Добавить cache/fallback.
8. Позже импортировать полноценную GeoNames-базу.

## Файлы для следующего этапа

В текущей рабочей копии менять нужно:

- `panchanga/index.html` - поле города, state location, отправка params.

В production/backend-репозитории нужно найти:

- `/api/panchanga`;
- `/api/full/html`;
- расчет lagna/grahas/sunrise/sunset;
- timezone/local datetime conversion;
- default location fallback.
