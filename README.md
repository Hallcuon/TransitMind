# TransitMind

Вебзастосунок **картографічної платформи** з плануванням маршруту на карті (Leaflet), маршрутизацією через **OSRM**, збагаченням даних (погода Open-Meteo, опційно трафік **TomTom**), візуалізацією метрик у бічній панелі та режимом **подорожі-сесії** з анімацією руху по траєкторії.

**Стек:** React 19 + Vite 7 · Node.js + Express 5 · PostgreSQL · Leaflet.

## Швидкий старт

З кореня репозиторію (npm workspaces):

```bash
npm install
npm run dev
```

- Фронтенд: [http://localhost:5173](http://localhost:5173)  
- Бекенд: [http://localhost:3001](http://localhost:3001) · `GET /api/health`

Детальніше: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md), налаштування БД: [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

## Змінні середовища

| Файл | Призначення |
|------|-------------|
| `backend/.env` | Скопіюй з `backend/.env.example`: `PORT`, `DB_*`, опційно `TOMTOM_API_KEY`. |
| `frontend/.env` | Опційно `VITE_API_URL` (за замовчуванням API очікується на `http://localhost:3001`). |

Файли `.env` **не** комітяться (див. `.gitignore`).

## Структура

```
TransitMind/
├── frontend/          # React SPA
├── backend/           # Express API
├── docs/              # Документація, схема БД, матеріали для диплому
├── scripts/           # Допоміжні скрипти (ensure-env для dev)
└── package.json       # workspaces + npm run dev
```

## Документація для дипломної роботи

Повний технічний опис для записки та контексту для LLM: **[docs/DIPLOMA.md](docs/DIPLOMA.md)**.

## Ліцензія

ISC (див. `backend/package.json`). При потребі змініть під вимоги ВНЗ.

## Публікація на GitHub

1. Створіть порожній репозиторій на GitHub (без README, якщо хочете запушити свій).
2. У корені проєкту (якщо ще немає git): `git init`
3. `git add .` → `git commit -m "Initial commit: TransitMind"`
4. `git branch -M main` → `git remote add origin https://github.com/<user>/<repo>.git`
5. `git push -u origin main`

Перед першим push переконайтесь, що **не** потрапили файли `.env` (вони в `.gitignore`). Якщо `package-lock.json` раніше не комітився — після оновлення `.gitignore` він має з’явитися в репозиторії після `git add`.
