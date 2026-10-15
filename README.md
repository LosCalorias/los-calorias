<div align="center">

# Los Calorías

Turn a recipe video into a recipe with calories and macros,<br>log what you eat, and see what's left of your daily goal.

<a href="https://github.com/LosCalorias/los-calorias/actions/workflows/ci.yml"><img src="https://github.com/LosCalorias/los-calorias/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="https://github.com/LosCalorias/los-calorias/releases"><img src="https://img.shields.io/github/v/release/LosCalorias/los-calorias?include_prereleases&sort=semver" alt="Release"></a>
<img src="https://img.shields.io/badge/python-3.12-blue.svg" alt="Python 3.12">

</div>

---

## What it does

- **Import a recipe** from a TikTok or Instagram Reels link: the audio is transcribed with Whisper and structured with GPT-4o.
- **Calories and macros** per serving and in total, rescaled when you change the number of servings.
- **Daily goal** from your profile (Mifflin–St Jeor), with safe lower limits.
- **Meal log** with what's left of today's goal.

## Repository

```
backend/              FastAPI app, Alembic migrations, tests
apps/mobile/          Expo app (coming soon)
.github/              CI, release-please
docker-compose.yml    Postgres + backend for local development
```
