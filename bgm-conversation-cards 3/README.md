# BGM Conversation Cards

A mobile-first, self-contained web app for the BGM Meetup conversation-card activity.

## Run locally
Open `index.html` in a modern browser. Keep the `assets` folder next to it; it contains the illustrated trading-card covers and deck artwork.

## Features
- Five themed decks with ten prompts each (50 prompts total).
- Each deck has a distinct illustrated cover and matching artwork on the drawn question card.
- Questions are shuffled locally on each device; no question repeats within a deck until all ten have been drawn.
- No account or database is required for the current functionality.
- Responsive layout for mobile phones and desktop browsers.

## Deployment
Deploy the entire folder, including `assets/`, to a static hosting provider such as Vercel or Netlify. Do not upload only `index.html`, or the deck artwork will be missing. Supabase is not needed unless you later want editable question decks, shared analytics, or an admin dashboard.

## Important
The app has not been tested on every device/browser combination. Test the deployed link on iPhone and Android before the meetup.


## Updated features
- English / Arabic language toggle with translated interface and all 50 questions.
- Selecting a deck automatically draws a question and smoothly scrolls to the question card.
- A local-device Easter egg appears every 50 question draws: ask Nia to buy you a coffee. The count is saved in that browser.
