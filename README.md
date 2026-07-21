# Pumpkin 🎃

A mobile app that helps you build a digital wardrobe and get AI-powered outfit suggestions from clothes you already own.

## The Problem

Wardrobe overwhelm: you own 50 items but wear 10. You can't remember what you have, and picking outfits takes forever.

## The Solution

Photograph your clothes once. The app learns your wardrobe, suggests outfit combinations, and considers weather and occasion.

## Tech Stack

- **Mobile:** React Native + Expo (iOS/Android from Windows, no Mac needed)
- **Backend:** Supabase (PostgreSQL + Auth + Storage, EU region)
- **AI:** Claude API — Haiku 4.5 with vision, structured outputs, and prompt caching
- **Image processing:** on-device subject segmentation (background removal — free, private; rembg as a server fallback)
- **Weather:** Open-Meteo
- **Language:** TypeScript

## Two AI helpers

The app leans on two distinct Claude calls (see the design docs below):

- **Cataloguer** — looks at each photo *once* and writes an "index card" for the item (type, colour, formality, warmth…).
- **Stylist** — reads the index cards (text only, no images) plus your preferences and suggests outfits with reasoning. Fast and cheap because it never touches images.

## Design & Planning

The approach was first validated with a click-through prototype ([`happy-eagle-prototype`](https://github.com/Ckilic123/happy-eagle-prototype)) that got good user feedback — but faked all AI. This repo is the real build. Full design lives in [`docs/`](docs/):

- **[PRD.md](docs/PRD.md) — start here** (source of truth + current build target)
- [user-journey.md](docs/user-journey.md) — end-to-end experience + backend + onboarding
- [tagging-spike.md](docs/tagging-spike.md) — the Cataloguer + the index-card schema
- [tagging-spike-results.md](docs/tagging-spike-results.md) — proof the tagging works (GO with Claude)
- [suggestion-spike.md](docs/suggestion-spike.md) — the Stylist
- [data-model.md](docs/data-model.md) — Supabase tables, security (RLS), storage

## Features (Roadmap)

- [x] Project planning & design (docs complete)
- [ ] Spike: prove AI tagging accuracy (Fashionpedia, Claude vs FashionCLIP) — **next**
- [ ] Phase 1: Wardrobe core (batch photo → tags → grid)
- [ ] Phase 2: AI auto-tagging + background removal
- [ ] Phase 3: Match-from-item suggestions
- [ ] Phase 4: Outfit-of-the-day + weather
- [ ] Phase 5: Occasion-based matching
- [ ] Phase 6: App Store launch

## How to Run Locally

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your iPhone to test live. *(App code not scaffolded yet — design phase.)*

## Cost

- During development: ~$3–4/month (Claude API only)
- Apple Developer fee: $99/year (when publishing to the App Store)

## What I'm Learning

- React Native & Expo for cross-platform iOS development from Windows
- Supabase for full-stack auth + database + storage
- Claude API integration with vision & prompt caching
- App Store submission flow

---

Built as both a personal tool and a portfolio project.
