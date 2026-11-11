"""Builds docs/Ankura_case_pack_deck.pptx, the five-page deck for the Ankura build task.
Run: python3 docs/deck/build_deck.py  (from the repo root). Uses the consulting-deck kit in ~/.claude/skills/consulting-deck/scripts.
Content is the fact-checked deck of 11 Nov 2026. Numbers come from evals/results and docs/decisions.md.
"""
import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/consulting-deck/scripts"))
import deckkit as dk
dk.set_palette(dark="#10243E", accent="#2B5C8A", rival="#5B6470", tint="#EEF4FA", press="#B7791F")
from deckkit import *

# The look Lexi approved for the Business Strategy deck on 10 Nov 2026: Arial bold 24pt titles, off-white page, no rule under the title.
OFFWHITE = "#F6F4EF"; RULE_P = "#D9D6CF"
def new_slide(name, ttl, src, num, notes=""):
    dk.CUR = name; dk.NAMES.append(name)
    s = dk.prs.slides.add_slide(dk.BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = rgb(OFFWHITE)
    n = nlines(ttl, 24, CW, bold=True); dk.check(n <= 2, f"title {n} lines")
    tb(s, L, 0.55, CW, 0.90 if n > 1 else 0.48, ttl, 24, DARK, True, font="Arial", anchor="t", lh=29)
    dk.SHIFT[len(dk.prs.slides) - 1] = ONE_LINE_SHIFT if n == 1 else 0.0
    dk.footer(s, src, num)
    if notes: s.notes_slide.notes_text_frame.text = notes
    return s

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.environ.get("DECK_SHOTS", "/private/tmp/claude-501/-Users-Lexi/2ed3c97a-acd9-4e1e-be00-c199f695854e/scratchpad/deck/shots")
OUT = os.path.join(ROOT, "docs", "Ankura_case_pack_deck.pptx")
GITHUB = "github.com/lexirosenthal11903-sudo/ankura-casepack"
SZ, LH = 12, 14.5

def table(s, x, y, w, cols, rows=None, size=SZ, lh=LH, pad=0.05, shade=None, last_rule=True):
    """cols = [(heading, width share)], rows = [[cell, ...], ...]. Header rule kept. Returns bottom y."""
    total = sum(c[1] for c in cols); widths = [w * c[1] / total for c in cols]
    xs = [x]
    for wd in widths[:-1]: xs.append(xs[-1] + wd)
    hh = max(nlines(hd, size, wd - 2 * pad, bold=True) for (hd, _), wd in zip(cols, widths)) * lh / 72
    for (hd, _), cx, wd in zip(cols, xs, widths):
        tb(s, cx + pad, y, wd - 2 * pad, hh + 0.02, hd, size, DARK, True, lh=lh, anchor="b")
    y += hh + 0.06; keep(hline(s, x, y, w, DARK, 1), "table header"); y += 0.03
    for ri, row in enumerate(rows):
        h = max(text_h(c, size, wd - 2 * pad, lh) for c, wd in zip(row, widths)) + 2 * pad
        pass
        for c, cx, wd in zip(row, xs, widths):
            tb(s, cx + pad, y + pad, wd - 2 * pad, h - 2 * pad, c, size, INK, lh=lh)
        y += h
        if last_rule or ri < len(rows) - 1: keep(hline(s, x, y, w, RULE_P, 0.75), "table row")
    return y

def para(s, x, y, w, text, size=SZ, lh=LH):
    h = text_h(text, size, w, lh); tb(s, x, y, w, h + 0.02, text, size, INK, lh=lh); return y + h + 0.08

def bullets(s, x, y, w, items=None, size=SZ, lh=LH, gap=0.0):
    for t in items:
        oval(s, x + 0.06, y + 0.10, 0.04, 0.04, DARK)
        y = para(s, x + 0.2, y, w - 0.2, t, size, lh) + gap
    return y

# ---------------------------------------------------------------- 1. cover
s = new_slide("cover", "A complaints case pack the handler can check: the AI drafts, code checks, a person decides",
    "Alexandra Rosenthal, Ankura AI by Design build task, Scenario 1, November 2026. Source: evals/results, held-back set, blind run, 3 repeats. Harbour &amp; Vale Bank is fictional and every customer, policy and complaint is synthetic.", 1,
    notes="Say the one idea in your own words. The AI drafts, the handler checks, the handler decides. Then point at the screenshot and the numbers. Say the ten held-back cases are the real test.")
pw = SPAN(6) + 0.3; ph = pw * 1470 / 2880
s.shapes.add_picture(os.path.join(SHOTS, "case2-crop.png"), I(L), I(Y_BODY), width=I(pw))
tb(s, L, Y_BODY + ph + 0.15, pw, 0.5, "The handler's screen for one complaint: what the AI was allowed to see, the drafted pack with a source for each line, and the deadlines worked out by code. Case HV-007, a disputed card payment with a fake instruction hidden in the email.", 12, INK2, lh=15)
xr = X(8); wr = SPAN(5); y = Y_BODY
y = heading(s, xr, y, wr, "What it is")
y = para(s, xr, y, wr, "A working tool for a made-up UK bank. The AI drafts a case pack from the complaint and the bank's policy. Code hides personal details first and checks that every sentence quotes something real. A handler fills the gaps and signs off.")
y = heading(s, xr, y + 0.1, wr, "On 10 cases kept back until the end")
y = table(s, xr, y, wr, [("Measure", 3), ("Result", 1.3)], [
    ["Quote found in the source", "99 to 100%"],
    ["Right specialist team", "90 to 100%"],
    ["Cost and time per complaint", "0.47p, 42 s"],
    ["Weaknesses found and fixed (page 4)", "2"],
])
y = heading(s, xr, y + 0.16, wr, "Try it")
para(s, xr, y, wr, f"ankura-casepack.vercel.app, no login. The first page says where to start, with a two-minute guided tour.<br>Code and tests: {GITHUB}")

# ---------------------------------------------------------------- 2. problem and scope
s = new_slide("problem", "The hours go on assembling facts, so that is where the AI goes. The decision stays with people",
    "Source: FCA Handbook DISP 1.6.2R and 1.6.2AR; Financial Ombudsman Plans and Budget 2026/27; FCA complaints data 2026 H1. Scores and estimates are my own judgement.", 2,
    notes="Three problems, all about assembling, none about deciding. Walk the table top to bottom. The value figures are assumptions and you say so before anyone asks. Be ready to defend 'decide the outcome, left with people' on the phone.")
y = heading(s, L, Y_BODY, CW, "Seven steps in handling a complaint, scored for value, feasibility and risk, and what I did with each")
y = table(s, L, y, CW, [("Step", 2.2), ("Value", 0.8), ("Feasible now", 1.0), ("Risk", 0.8), ("What I did", 3.6)], [
    ["Log and categorise", "Medium", "Yes", "Low", "Included. Most case systems already do this."],
    ["<b>Find and assemble the facts</b>", "High", "Yes", "Low", "<b>Built.</b> Where the hours go, and every line can be checked."],
    ["<b>Handover pack for specialists</b>", "High", "Yes", "Low", "<b>Built.</b> Fixes the send-back problem directly."],
    ["Deadline tracking", "High", "Yes", "Low", "Code, not AI, because a time limit is a fixed rule. The rule itself can still be wrong."],
    ["Spot patterns across cases", "High", "Partly", "Low", "Prototyped as the team leader view."],
    ["Decide the outcome", "High", "No", "High", "Left with people. A regulated decision about a person."],
    ["Write to the customer", "Medium", "No", "High", "Left with people. The bank is liable for every word."],
])
half = SPAN(6); y0 = y + 0.42
y = heading(s, L, y0, half, "The brief's three problems are one problem")
para(s, L, y, half, "A growing backlog, handlers searching notes and policy, and incomplete handovers are all about finding facts, not deciding. A final answer is due within 8 weeks, or 15 business days for most payment complaints. After that the customer can go to the Ombudsman, at £680 a case.")
y = heading(s, X(7), y0, half, "What it could be worth (assumptions, not measurements)")
para(s, X(7), y, half, "If a handover takes 40 minutes today and 10 with the tool, a team handling 4,000 complaints a month gets back about 2,000 hours, roughly 12 people's time. Ten fewer deadline breaches a month saves £6,800. The pilot on page 5 gets the real figures.")

# ---------------------------------------------------------------- 3. how it works and the AI tools
s = new_slide("built", "The AI sits in one box of six. It drafts, code checks, and people decide",
    "Source: docs/decisions.md; evals/results/eval-dev-sonnet-2026-11-11-0859.md. Next.js and TypeScript on Vercel (London), 51 unit tests and 3 browser tests on every change.", 3,
    notes="Walk the six boxes left to right. The AI is only in box 3. Then the four mistakes. The assessors asked for an assessment of the tools, not praise, so spend time on the right-hand list.")
steps = [("1 Complaint arrives", "Email, call transcript or branch note, as the bank holds it."),
         ("2 Code hides details", "Names, accounts, phones and emails become labels like [CUSTOMER]."),
         ("3 AI drafts the pack", "Summary, timeline, policy, gaps, flags. Each line must quote its source."),
         ("4 Code checks it", "Does each quote exist in the source? Deadlines are calculated here."),
         ("5 Handler reviews", "Accepts, edits or rejects each line. Fills the gaps. Signs off."),
         ("6 Specialist decides", "Accepts or sends back with a reason. The team leader sees the queue.")]
bw = SPAN(2); y = Y_BODY; bh = 1.45
for k, (hd, body) in enumerate(steps):
    x = X(1 + 2 * k); ai = k == 2
    rect(s, x, y, bw, bh, DARK if ai else WHITE)
    tb(s, x + 0.1, y + 0.1, bw - 0.2, 0.22, hd, 12, WHITE if ai else DARK, True, lh=14, wrap=False)
    tb(s, x + 0.1, y + 0.42, bw - 0.2, bh - 0.5, body, 12, WHITE if ai else INK, lh=14.5)
y += bh + 0.4; y0 = y
yl = heading(s, L, y0, SPAN(6), "The AI tools I used and what I think of them")
yl = table(s, L, yl, SPAN(6), [("Tool", 1.5), ("Used for", 1.6), ("My view", 2.8)], size=12.5, lh=16, rows=[
    ["Claude Code", "Built the app, tests and scoring scripts with me", "Fast. Its mistakes look right until you check. Four are on the right."],
    ["Claude Haiku 5.5", "Drafts the case pack inside the tool", "Good enough for a checked draft at under half a penny a case. Weakest on policy citations, 66%."],
    ["Claude Sonnet 5.5", "Same 15 cases, bigger model", "Slightly better on policy (74%) at eight and a half times the cost."],
], last_rule=False)
yr = heading(s, X(7), y0, SPAN(6), "Four times the AI or I got it wrong, and how it was caught")
bullets(s, X(7), yr, SPAN(6), size=12.5, lh=16, gap=0.16, items=[
    "Gave a customer and her son the same label because they share a surname. Caught by printing every replacement.",
    "Hid an incident reference as if it were an account number, which would have broken the link between three complaints.",
    "Found 341 days overdrawn that my own answer key had missed. My key was wrong, and the change is logged.",
    "My plan relied on a feature the newest models no longer support. The current docs beat my assumption."])

# ---------------------------------------------------------------- 4. testing
s = new_slide("tested", "Ten cases held back until the end found two weaknesses. Both are fixed and both are reported",
    "Source: evals/results, eval-heldout-haiku-2026-11-11-0844-blind.md (blind), eval-heldout-haiku-2026-11-11-0919.md (after the fixes), eval-dev-haiku-2026-11-11-0925.md (development set); docs/decisions.md.", 4,
    notes="Answer sheet before prompt, ten cases never touched. Then the two findings, because they are the most honest things in the deck and they show the method working. Say the deadline one was your mistake, not the model's. Then the limits.")
y = heading(s, L, Y_BODY, SPAN(6), "Marked by code against answer sheets written before the AI instructions")
y = table(s, L, y, SPAN(6), [("Measure", 2.1), ("Tuned", 1.15), ("Blind", 1.4), ("Fixed", 1.15)], [
    ["Right specialist team", "100%", "90 to 100%", "90 to 100%"],
    ["<b>Right deadline rule</b>", "100%", "<b>60 to 80%</b> (corrected keys)", "80 to 89%"],
    ["Vulnerability signs flagged", "93%", "90%", "89 to 90%"],
    ["Missing information found", "93%", "85 to 91%", "82 to 90%"],
    ["Policy paragraphs cited", "66%", "67 to 74%", "70 to 73%"],
    ["Quote exists in the source", "100%", "99 to 100%", "100%"],
    ["<b>Planted personal details hidden</b>", "112 of 112", "<b>78 of 101</b>", "101 of 101"],
    ["Fake instruction flagged, not followed", "1 of 1", "n/a", "n/a"],
    ["Cost, time per case", "$0.0055, 40s", "$0.0063, 45s", "$0.0060, 42s"],
], shade={1, 6})
para(s, L, y + 0.1, SPAN(6), "Tuned: the 15 cases the AI instructions were improved on. Blind: the 10 held-back cases, 3 runs, the column to trust. Fixed: the same 10 after the two corrections.")
xr = X(8); wr = SPAN(5); y = Y_BODY
y = heading(s, xr, y, wr, "Why hiding details missed people")
y = para(s, xr, y, wr, "Every miss was a person the bank's record does not know, such as a boyfriend or a scammer's payee name. A new layer finds people from how the text introduces them. Now 101 of 101, but not blind, so both are shown.")
y = heading(s, xr, y + 0.06, wr, "The scam deadline was my rule, and wrong")
y = para(s, xr, y, wr, "The Ombudsman's guidance puts scam complaints on the 15 business day clock. My AI instructions, policy and three answer keys said 8 weeks. The engine is code so a rule is never guessed, and it still carried a wrong rule, because the rule came from a person.")
y = heading(s, xr, y + 0.02, wr, "What it cannot do")
bullets(s, xr, y, wr, [
    "A verified quote proves the words exist, not that they support the point.",
    "Accepting is by section, not one click, but a handler can still skim. In a pilot I would track review time per pack.",
    "25 synthetic cases, no handler time measured, no bank system. The pilot answers all three."])

# ---------------------------------------------------------------- 5. controls and staff
s = new_slide("controls", "Governance is in the code, and the handler's job moves from searching to checking",
    "Source: docs/VERIFIED_FACTS.md, UK rules checked at source, 11 Nov 2026. Policy CP-6.2 belongs to the fictional bank.", 5,
    notes="Left is governance, right is people. End on the over-trust warning, because nobody else will raise it and it comes from your own experience of how teams actually work.")
y = heading(s, L, Y_BODY, SPAN(6), "Controls that are in the code, not in a policy document")
y = table(s, L, y, SPAN(6), [("Control", 2.3), ("What it stops", 1.8), ("Rule behind it", 1.7)], lh=14, rows=[
    ["Personal details hidden before any AI call", "Customer data leaving the bank", "UK GDPR, data minimisation"],
    ["Every sentence quotes its source or is marked red", "Made-up facts reaching a decision", "Consumer Duty"],
    ["No field exists for an outcome or compensation", "The AI deciding, or being tricked into it", "UK GDPR Arts 22A to 22D, DISP 1.4"],
    ["Handover blocked until every gap is filled or explained", "Incomplete handovers", "Bank policy CP-6.2 (fictional)"],
    ["Vulnerability signs recorded before handover", "Missing someone who needs extra care", "FCA guidance FG21/1"],
    ["The AI model and instructions version recorded on every run", "Not being able to explain a case later", "DISP 1.9 record keeping"],
    ["Rate limits, a spend cap, an off switch", "Runaway cost, or a bad model day", "The bank's own controls"],
])
para(s, L, y + 0.08, SPAN(6), "<b>A person always</b> confirms the deadline rule, fills every gap, signs off, accepts or sends back, and decides the outcome.")
xr = X(8); wr = SPAN(5); y = Y_BODY
y = heading(s, xr, y, wr, "What changes for staff")
y = table(s, xr, y, wr, [("Role", 0.9), ("Now", 1.6), ("With the tool", 1.6)], [
    ["Handler", "Searches systems, finds policy, writes from a blank page", "Checks a draft with sources, fills gaps, signs off"],
    ["Specialist", "Gets what the handler remembered, chases the rest", "Gets a complete pack, accepts or sends back"],
    ["Team leader", "Builds reports by hand", "Sees backlog, deadlines and repeat problems live"],
])
y = heading(s, xr, y + 0.12, wr, "Pilot")
y = para(s, xr, y, wr, "One product line, ten handlers, eight to twelve weeks, against a comparison group. Measure time to handover, send-backs and missed deadlines.")
y = heading(s, xr, y + 0.06, wr, "To a worried handler")
para(s, xr, y, wr, "Nothing leaves your desk without your name on it. If the rejection rate falls towards zero, that is a warning: people have stopped reading.")

finish(OUT, {"cover": 1, "problem": 2, "built": 3, "tested": 4, "controls": 5}, table_slides=(2, 3, 4, 5))
