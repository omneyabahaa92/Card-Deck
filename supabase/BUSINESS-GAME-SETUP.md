# BGM Business Growth Game — setup notes

## What this backend migration provides
- One challenge set per Cairo calendar date, with an explicit start/end time.
- Ten bilingual questions per set, across business skill categories.
- Public challenge data excludes answer keys and explanations.
- One scored submission per member/question.
- Public leaderboard returns display names and points only; WhatsApp numbers are never returned.
- Private member table and answer table have RLS enabled and direct table access revoked.

## Important security note
The registration RPC is an MVP convenience, not identity verification. A visitor can submit a phone number they do not own. Before using scores for valuable prizes, configure verified sign-in (e.g. Supabase Auth with an OTP provider) and bind member IDs to authenticated identities. Never expose a Supabase service-role key in the browser.

## Setup
1. Create a Supabase project.
2. Run `supabase/business-game-schema.sql` in SQL Editor.
3. Configure verified identity before announcing prizes.
4. Create an authenticated organizer/admin workflow to publish a set. The public app must not be allowed to write correct answers or publish sets.
5. Add exactly ten rows in `bgm_questions` for each set. Use `Africa/Cairo` to calculate each day's noon start and next day's noon end, then store those instants in `starts_at` and `ends_at`.
6. Publish by setting `is_published = true` only after all ten questions and translations have been reviewed.
7. Configure the frontend with the Supabase project URL and anon/publishable key only. Never use the service-role key client-side.

## Daily content workflow
Ask ChatGPT to draft ten scenario-based multiple-choice questions with four options each, across Customer Discovery, Sales, Marketing, Strategy, and Negotiation (two per skill). Require English and Egyptian Arabic, one defensible best answer, a short explanation in both languages, and a difficulty mix. Review the set, then insert it using an authenticated organizer workflow. Schedule publishing at noon Cairo time only after the organizer has approved the content.

## Rules used in this MVP
- Correct answer: award the question's configured points (recommended 10).
- Incorrect answer: 0 points, but show explanation.
- One answer per question per member.
- Weekly ranking: points accumulated for challenge dates within the Cairo week (Monday–Sunday).
- Tie-break: correct answers, then display name alphabetically.
- Leaderboard shows display name and score only.

## Not finished by this SQL file alone
This is a database foundation, not a complete deployment. Frontend Supabase connection, verified identity, organizer publishing UI, and scheduled question publishing still need to be configured and tested. The countdown should use the active challenge's server-provided `ends_at`, not a browser-local guess.
