# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Initial project setup
- Reviewed the `happy-eagle-prototype` (Next.js click-through); confirmed it validates the UX but fakes all AI
- Design docs under `docs/`: user journey (UX + backend + onboarding), tagging spike (Cataloguer + index-card schema), suggestion spike (Stylist), and the Supabase data model (tables + RLS + storage)
- Locked design decisions: anonymous-first auth, batch add + review, two separate Claude calls (tagging vs suggestion), onboarding = 3 taps, tagging validated against Fashionpedia (Claude Haiku vs FashionCLIP), suggestion v1 = "find matches" with 3 outfits

- Tagging accuracy spike (`spikes/tagging/`): standalone Python harness benchmarking Claude Haiku 4.5 vs FashionCLIP against a labeled dataset, with a per-field scorecard
- Tagging spike results (`docs/tagging-spike-results.md`): on 50 images, Haiku scored category 92% / occasions 90% and produced every field FashionCLIP can't; verdict is GO with Claude (Haiku default, close to Opus at ~1/5 cost)
- `docs/PRD.md` — product spec + source-of-truth index + Phase 1 (wardrobe core) scope and acceptance criteria; the entry point for building

### Changed
- Renamed the product **Happy Eagle → Pumpkin** (docs, README, Expo app name/slug/scheme). The GitHub repo and the `happy-eagle-prototype` reference keep their existing names.
- `docs/tagging-spike.md`: reconciled the ground-truth dataset (Fashionpedia → `fashion-product-images`, discovered during the build) and recorded the GO verdict
- Scaffolded the Expo app (SDK 57, TypeScript, Expo Router) in `app/`; added design guidelines (`docs/design-guidelines.md`)

### Fixed
- README: corrected mangled cost figures and code fence; added design-docs links and the two-AI-helpers overview

