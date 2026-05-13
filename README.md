# TransitMind

Вебзастосунок **картографічної платформи** з плануванням маршруту на карті (Leaflet), маршрутизацією через **OSRM**, збагаченням даних (погода Open-Meteo, опційно трафік **TomTom**), візуалізацією метрик у бічній панелі та режимом **подорожі-сесії** з анімацією руху по траєкторії.

**Стек:** React 19 + Vite 7 · Node.js + Express 5 · PostgreSQL · Leaflet.

<img width="1500" height="804" alt="image" src="https://github.com/user-attachments/assets/41bed23b-b533-438a-a99f-12ecc04b7b88" />
<img width="1500" height="804" alt="image" src="https://github.com/user-attachments/assets/976c3b15-cfbc-4478-8c3c-eefaef536cf6" />
<img width="1500" height="803" alt="image" src="https://github.com/user-attachments/assets/a268fa51-3683-4ed8-bd71-8203f15a3b73" />




- Фронтенд: [http://localhost:5173](http://localhost:5173)  
- Бекенд: [http://localhost:3001](http://localhost:3001) · `GET /api/health`

Детальніше: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md), налаштування БД: [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

## Змінні середовища

| Файл | Призначення |
|------|-------------|
| `backend/.env` | Скопіюй з `backend/.env.example`: `PORT`, `DB_*`, опційно `TOMTOM_API_KEY`. |
| `frontend/.env` | Опційно `VITE_API_URL` (за замовчуванням API очікується на `http://localhost:3001`). |


## Структура

```
TransitMind/
├── frontend/          # React SPA
├── backend/           # Express API
├── docs/              # Документація, схема БД, матеріали для диплому
├── scripts/           # Допоміжні скрипти (ensure-env для dev)
└── package.json       # workspaces + npm run dev
```

