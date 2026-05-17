## Parent PRD

`issues/prd.md`

## What to build

Implement backend logic to lazily generate and cache context-aware reflection prompts. Update the `daily_verse_log` table schema to include `prompt_1` and `prompt_2`. In the daily verse fetching logic, if prompts do not exist for the current day's verse, call the OpenRouter API to generate them based on the verse's meaning/tafsir, save them to the database, and return them.

## Acceptance criteria

- [ ] `daily_verse_log` table schema is updated to store `prompt_1` and `prompt_2`.
- [ ] `GET /api/v1/daily` checks if prompts exist for the day.
- [ ] If prompts are missing, it calls OpenRouter to generate two reflection questions and saves them to the DB.
- [ ] If prompts already exist, it fetches and returns them without calling OpenRouter.
- [ ] Fallback static prompts are returned if the OpenRouter API call fails.

## Blocked by

None - can start immediately

## User stories addressed

- Feature 1: Context-Aware AI Prompts
