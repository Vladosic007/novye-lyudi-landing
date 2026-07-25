# Новые люди — лендинг «Против блокировок интернета»

Одностраничный сайт для сбора заявок. Ванильный HTML/CSS/JS + serverless-функция
на Vercel, заявки уходят в Google-таблицу.

## Структура
```
partia lending/
├── index.html            ← страница (весь текст правится здесь)
├── privacy.html          ← политика конфиденциальности (шаблон)
├── assets/
│   ├── css/styles.css     ← дизайн-система (цвета партии)
│   ├── js/main.js         ← меню, анимации, форма
│   ├── img/logo-nl.png    ← логотип
│   └── video/             ← сюда положить hero.mp4
├── api/submit.js          ← приём заявок (serverless)
├── vercel.json            ← конфиг хостинга
├── КАК-РЕДАКТИРОВАТЬ.md   ← инструкция по правке текста
└── .env.example           ← пример секретов для Google Sheets
```

## Локальный просмотр
- Быстро: открыть `index.html` в браузере (форма не отправляется — это нормально).
- С работающей формой: установить [Node.js](https://nodejs.org) и запустить
  `npx vercel dev` в папке проекта.

## Публикация на Vercel
1. Залить папку в репозиторий Git (GitHub/GitLab).
2. На [vercel.com](https://vercel.com) → **Add New → Project** → импортировать репозиторий.
3. Framework Preset: **Other** (сборка не нужна). Нажать **Deploy**.
4. Через минуту сайт доступен по адресу `*.vercel.app`.

## Подключение домена
Vercel → Project → **Settings → Domains** → добавить домен и прописать указанные
DNS-записи у регистратора.

## Заявки в Google-таблицу (этап Ф2)
1. Создать таблицу, в первой строке колонки: `Дата | Имя | Телефон | Комментарий | Источник`.
2. В [Google Cloud Console](https://console.cloud.google.com) создать **Service Account**,
   включить **Google Sheets API**, скачать JSON-ключ.
3. Открыть таблице доступ на редактирование для e-mail сервисного аккаунта.
4. Значения из ключа занести в переменные окружения Vercel (см. `.env.example`):
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`.
5. Установить зависимость `googleapis` и раскомментировать блок записи в `api/submit.js`.

---
Фирменные цвета: бирюза партии «Новые люди» — `#18CFC5` / `#0C8F87`.
Шрифты: Lexend + Source Sans 3.
