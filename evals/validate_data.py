"""Checks every test case and answer key against the bank's own lists.

Run: python3 evals/validate_data.py
Exits non-zero if anything is wrong, so it can run in CI later.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
bank = json.loads((ROOT / "data/bank.json").read_text())
policy = json.loads((ROOT / "data/policies/complaints-policy.json").read_text())
checklists = json.loads((ROOT / "data/checklists.json").read_text())

PRODUCTS = {p["id"] for p in bank["products"]}
CAUSES = {c["id"] for c in bank["causes"]}
TEAMS = {t["id"] for t in bank["teams"]}
POLICY_IDS = {p["id"] for p in policy["paragraphs"]}
COMMON = {i["id"] for i in checklists["common"]}
TEAM_ITEMS = {t: {i["id"] for i in items} for t, items in checklists["teams"].items()}
CLOCKS = {"8_weeks", "15_business_days", "confirm"}
SYSTEMS = {"CRM", "CORE", "CARDS", "EMAIL", "LETTER", "WEBFORM", "BRANCH"}
CHANNELS = {"phone", "email", "web_form", "branch", "letter", "social"}
DATE = re.compile(r"^2026-(09|10|11)-\d\d$")
FICTIONAL_PHONE = re.compile(r"(07700 ?900 ?\d{3}|01632 ?960 ?\d{3}|020 ?7946 ?0\d{3}|0\d{3} ?496 ?0\d{3}|0\d{2} ?496 ?0\d{3})")
ANY_PHONE = re.compile(r"\b0\d{2,4}[ ]?\d{3,4}[ ]?\d{3,4}\b")

errors = []
def err(case, msg):
    errors.append(f"{case}: {msg}")

cases = sorted((ROOT / "data/complaints").glob("HV-*.json"))
keys = {p.stem for p in (ROOT / "evals/answer-key").glob("HV-*.json")}
splits = {"dev": 0, "heldout": 0}

for path in cases:
    cid = path.stem
    try:
        c = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        err(cid, f"case JSON invalid: {e}"); continue
    if c.get("id") != cid: err(cid, "id does not match file name")
    if c.get("split") not in splits: err(cid, "split must be dev or heldout")
    else: splits[c["split"]] += 1
    if not DATE.match(c.get("received", "")): err(cid, "received date outside Sep-Nov 2026 or badly formatted")
    if c.get("channel") not in CHANNELS: err(cid, f"bad channel {c.get('channel')}")
    for a in c.get("record", {}).get("accounts", []):
        if a.get("product") not in PRODUCTS: err(cid, f"bad account product {a.get('product')}")
        if a.get("sort_code") and not a["sort_code"].startswith("77-41-"): err(cid, "sort code must use the fictional 77-41 prefix")
    docs = c.get("documents", [])
    if not docs: err(cid, "no documents")
    all_text = "\n".join(d.get("text", "") for d in docs)
    for d in docs:
        if d.get("system") not in SYSTEMS: err(cid, f"{d.get('id')} bad system {d.get('system')}")
        if not DATE.match(d.get("date", "")) and not re.match(r"^2026-0[6-8]-\d\d$", d.get("date", "")):
            err(cid, f"{d.get('id')} date {d.get('date')} looks wrong")
    for m in ANY_PHONE.finditer(all_text):
        if not FICTIONAL_PHONE.search(m.group(0)): err(cid, f"phone number not in a fictional range: {m.group(0)}")
    for m in re.finditer(r"[\w.+-]+@[\w-]+\.[\w.]+", all_text):
        if not m.group(0).lower().endswith(("example.com", "example.org", "example.co.uk")):
            err(cid, f"email not on an example domain: {m.group(0)}")

    if cid not in keys:
        err(cid, "no answer key"); continue
    k = json.loads((ROOT / f"evals/answer-key/{cid}.json").read_text())
    for i in k.get("issues", []):
        if i.get("product") not in PRODUCTS: err(cid, f"key: bad product {i.get('product')}")
        if i.get("cause") not in CAUSES: err(cid, f"key: bad cause {i.get('cause')}")
    if k.get("team") not in TEAMS: err(cid, f"key: bad team {k.get('team')}")
    if k.get("disp_clock") not in CLOCKS: err(cid, f"key: bad disp_clock {k.get('disp_clock')}")
    for p in k.get("expected_policy_ids", []):
        if p not in POLICY_IDS: err(cid, f"key: unknown policy id {p}")
    allowed = COMMON | TEAM_ITEMS.get(k.get("team"), set())
    for m in k.get("missing_info", []):
        if m not in allowed: err(cid, f"key: missing_info id {m} not on the common or {k.get('team')} checklist")
    for s in k.get("planted_pii", []):
        if s not in all_text: err(cid, f"key: planted_pii '{s}' does not appear in any document")
    if not k.get("rationale"): err(cid, "key: no rationale")

for stray in keys - {p.stem for p in cases}:
    err(stray, "answer key with no case file")

print(f"{len(cases)} cases ({splits['dev']} dev, {splits['heldout']} held out), {len(keys)} answer keys")
if errors:
    print(f"{len(errors)} problem(s):")
    for e in errors: print("  -", e)
    sys.exit(1)
print("All checks passed.")
