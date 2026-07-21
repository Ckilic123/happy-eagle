"""Grade predictions against ground truth, per field, and print a scorecard."""
from __future__ import annotations

from collections import Counter

from schema import GRADEABLE, JUDGMENT_FIELDS

_COLOR_SYNONYMS = {
    "navy": {"navy", "navy blue", "dark blue"},
    "blue": {"blue", "light blue", "sky blue"},
    "grey": {"grey", "gray", "charcoal"},
    "beige": {"beige", "tan", "khaki", "cream"},
    "black": {"black"},
    "white": {"white", "off-white", "ivory"},
    "brown": {"brown", "coffee"},
}


def _norm(value) -> str:
    return str(value).strip().lower()


def _match(kind: str, truth, pred) -> bool:
    if pred is None:
        return False
    if kind == "exact":
        return _norm(truth) == _norm(pred)
    if kind == "fuzzy":
        t, p = _norm(truth), _norm(pred)
        return t in p or p in t or bool(set(t.split()) & set(p.split()))
    if kind == "color":
        t, p = _norm(truth), _norm(pred)
        if t == p or t in p or p in t:
            return True
        return any(t in syns and p in syns for syns in _COLOR_SYNONYMS.values())
    if kind == "set":
        ts = {_norm(x) for x in (truth or [])}
        ps = {_norm(x) for x in (pred or [])}
        return bool(ts & ps) if ts else True
    return False


def score(truths: list[dict], preds: list[dict]) -> dict:
    """Per-field {n, correct, pct} over samples where truth has the field."""
    result: dict = {}
    for field, kind in GRADEABLE.items():
        n = correct = 0
        for truth, pred in zip(truths, preds):
            if field not in truth or truth[field] in (None, "", []):
                continue
            n += 1
            if _match(kind, truth[field], pred.get(field)):
                correct += 1
        if n:
            result[field] = {"n": n, "correct": correct, "pct": 100.0 * correct / n}
    return result


def print_scorecard(title: str, result: dict) -> None:
    print(f"\n== {title} ==")
    print(f"{'field':<16}{'n':>5}{'correct':>10}{'accuracy':>11}")
    print("-" * 42)
    for field, r in result.items():
        print(f"{field:<16}{r['n']:>5}{r['correct']:>10}{r['pct']:>10.0f}%")
    if not result:
        print("(no gradeable fields present in ground truth)")


def judgment_summary(preds: list[dict]) -> None:
    """Judgment fields have no dataset ground truth — dump distributions to eyeball."""
    print("\n== judgment fields (no ground truth — review by eye) ==")
    for field in JUDGMENT_FIELDS:
        vals = [p.get(field) for p in preds if p.get(field) is not None]
        if not vals:
            continue
        if isinstance(vals[0], list):
            dist = Counter(x for v in vals for x in v)
        else:
            dist = Counter(str(v) for v in vals)
        top = ", ".join(f"{k}:{c}" for k, c in dist.most_common(6))
        print(f"  {field:<16} {top}")
