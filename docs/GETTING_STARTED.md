# Перші кроки (TransitMind)

## Вимоги

- Node.js 18+
- PostgreSQL
- npm

## 1. Клонування та залежності

```bash
cd TransitMind
npm install
```

Це встановить залежності **workspaces** (`frontend`, `backend`) з кореня.

## 2. База даних

Див. **[DATABASE_SETUP.md](DATABASE_SETUP.md)** та **`docs/schema.sql`**.  
Після розгортання схеми за потреби виконайте скорочення таблиць (якщо ще не робили):

```bash
npm run migrate:core
```

## 3. Конфігурація

```bash
copy backend\.env.example backend\.env
# Відредагуйте backend\.env — DB_*, опційно TOMTOM_API_KEY
```

Фронтенд: за потреби `frontend/.env` з `VITE_API_URL` (якщо API не на `localhost:3001`).

## 4. Запуск

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:3001  

Перевірка: `GET http://localhost:3001/api/health`

## 5. Окремо бекенд / фронтенд

```bash
npm run dev:backend
npm run dev:frontend
```

## 6. Документація для диплому

**[DIPLOMA.md](DIPLOMA.md)** — повний опис для записки та контексту LLM.
