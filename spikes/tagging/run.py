"""Tagging accuracy spike — run Claude and/or FashionCLIP over a labeled set and score.

Examples:
  py run.py --selftest                          # offline: exercises eval logic (no key/network)
  py run.py --smoke                             # 1 synthetic image through Claude (needs API key)
  py run.py --n 50 --models claude-haiku
  py run.py --n 50 --models claude-haiku,fashionclip
  py run.py --n 15 --models claude-opus         # accuracy-ceiling slice
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import data
import evaluate


def _load_env() -> None:
    """Minimal .env loader so ANTHROPIC_API_KEY can live in spikes/tagging/.env."""
    from pathlib import Path

    env = Path(__file__).with_name(".env")
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())


def _anthropic_client():
    import anthropic

    return anthropic.Anthropic()


def run_selftest() -> None:
    samples = data.mock_samples()
    truth = [s.truth for s in samples]
    good = [dict(s.truth) for s in samples]
    bad = [dict(s.truth) for s in samples]
    bad[0]["category"] = "dress"           # one wrong category
    bad[1]["primary_color"] = "white"      # one wrong color
    print("Self-test: eval logic on mock data (no network, no API key).")
    evaluate.print_scorecard("perfect tagger", evaluate.score(truth, good))
    evaluate.print_scorecard("wrong-on-two tagger", evaluate.score(truth, bad))
    evaluate.judgment_summary([{"formality": 3, "warmth": 3, "visual_weight": "neutral"}])
    print("\nSelf-test OK.")


def run_smoke() -> None:
    from PIL import Image

    import tag_claude

    client = _anthropic_client()
    img = Image.new("RGB", (128, 128), (20, 20, 60))
    print("Smoke: one synthetic image through Claude Haiku (wiring test, not accuracy)...")
    card = tag_claude.tag_image(client, img, "claude-haiku-4-5")
    print(json.dumps(card, indent=2))
    print("\nSmoke OK — Claude vision + structured output wired correctly.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Tagging accuracy spike")
    ap.add_argument("--n", type=int, default=50)
    ap.add_argument("--dataset", default="fashion-product-images",
                    choices=["fashion-product-images", "fashionpedia"])
    ap.add_argument("--models", default="claude-haiku",
                    help="comma list: claude-haiku, claude-opus, fashionclip")
    ap.add_argument("--out", default="results.json")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--smoke", action="store_true")
    args = ap.parse_args()

    _load_env()
    if args.selftest:
        return run_selftest()
    if args.smoke:
        return run_smoke()

    models = [m.strip() for m in args.models.split(",") if m.strip()]
    print(f"Loading {args.n} samples from {args.dataset} ...")
    samples = data.load_samples(args.n, args.dataset)
    print(f"Loaded {len(samples)} samples.")
    truth = [s.truth for s in samples]

    all_preds: dict = {}
    client = None
    for m in models:
        preds: list[dict] = []
        if m in ("claude-haiku", "claude-opus"):
            import tag_claude

            client = client or _anthropic_client()
            model_id = "claude-haiku-4-5" if m == "claude-haiku" else "claude-opus-4-8"
            for i, s in enumerate(samples):
                preds.append(tag_claude.tag_image(client, s.image, model_id))
                print(f"  [{m}] {i + 1}/{len(samples)}", end="\r")
            print()
        elif m == "fashionclip":
            import tag_fashionclip

            for i, s in enumerate(samples):
                preds.append(tag_fashionclip.tag_image(s.image))
                print(f"  [fashionclip] {i + 1}/{len(samples)}", end="\r")
            print()
        else:
            print(f"unknown model: {m}", file=sys.stderr)
            continue

        all_preds[m] = preds
        evaluate.print_scorecard(m, evaluate.score(truth, preds))
        if m in ("claude-haiku", "claude-opus"):
            evaluate.judgment_summary(preds)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"truth": truth, "preds": all_preds}, f, indent=2, default=str)
    print(f"\nWrote raw predictions to {args.out}")


if __name__ == "__main__":
    main()
