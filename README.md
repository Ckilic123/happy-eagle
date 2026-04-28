# Happy Eagle 🦅

A mobile app that helps you build a digital wardrobe and get AI-powered outfit suggestions from clothes you already own.

## The Problem

Wardrobe overwhelm: you own 50 items but wear 10. You can't remember what you have, and picking outfits takes forever.

## The Solution

Photograph your clothes once. The app learns your wardrobe, suggests outfit combinations, and considers weather and occasion.

## Tech Stack

- **Mobile:** React Native + Expo (iOS/Android from Windows, no Mac needed)
- **Backend:** Supabase (PostgreSQL + Auth + Storage, EU region)
- **AI:** Claude API (Haiku 4.5 with prompt caching)
- **Image processing:** remove.bg (background removal)
- **Weather:** Open-Meteo
- **Language:** TypeScript

## Features (Roadmap)

- [x] Project planning & setup
- [ ] Phase 1: Wardrobe core (photo → manual tags → grid)
- [ ] Phase 2: AI auto-tagging + background removal
- [ ] Phase 3: Match-from-item suggestions
- [ ] Phase 4: Outfit-of-the-day + weather
- [ ] Phase 5: Occasion-based matching
- [ ] Phase 6: App Store launch

## How to Run Locally

\\\ash
npm install
npx expo start
\\\

Scan the QR code with Expo Go on your iPhone to test live.

## Cost

- During development: ~\–4/month (Claude API only)
- Apple Developer fee: \/year (when publishing to App Store)

## What I'm Learning

- React Native & Expo for cross-platform iOS development from Windows
- Supabase for full-stack auth + database + storage
- Claude API integration with vision & prompt caching
- App Store submission flow

---

Built as both a personal tool and a portfolio project.
