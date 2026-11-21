# Tiny World Stories: data review and v3 upgrade proposal (20 Nov 2026)

## 1. What the data says

**Channel (YouTube Studio, last 28 days):** 5.2k views, 17 subscribers. 99% of viewers are new and 0% are regulars. More than 95% of views come from the Shorts feed; YouTube search brings about 2%.

**Every Short stops at about 1,300–1,400 views.** That is the size of YouTube's first feed test. None of them has been pushed to a second, wider audience.

**Retention curves (read from Studio's chart):**

| Short | Stayed to watch | 0 s | 5 s | 10 s | 15 s | Half-way | End |
|---|---|---|---|---|---|---|---|
| Work Smarter (63 s) | 67.5% | 131% | 122% | **88%** | 77% | 71% | 34% |
| Bamboo (63 s) | 62.5% | 108% | 104% | **64%** | 56% | 48% | 11% |

Free Money, Dinosaur and Dream Tax don't have enough data for a curve yet.

**Key finding:** the hooks work, since retention holds for the first 5 seconds. Then 35–40 points of viewers leave **between 5 s and 10 s**, during the "setup" scene that explains the premise. After 15 s the curve is nearly flat. So the 5–10 s window is the main thing to fix. A second, smaller drop comes from videos running 60 s or longer.

**SEO:** search is about 2% of views, so tags matter little. Titles still count, because they appear on screen in the feed. YouTube autocomplete (Nepal/IN/PH region) shows real demand for:
- what if you have 500 iq
- what if you could stop / freeze time
- what if everyone disappeared / disappeared except you
- what if you were the last man on earth
- what would happen if earth stopped spinning
- what would happen if all bees disappeared
- penny doubled every day for 30 days (already used)

## 2. Proposed v3 rules (new REFERENCE_STYLE_BIBLE_V3.md)

1. **Length:** 30–40 s, with no scene longer than about 3.5 s. Hard cap of 45 s.
2. **0–2 s hook:** the strangest image plus a title card plus a one-line question. Already working; keep it.
3. **2–6 s, stakes and an open loop:** give the payoff number or the twist right away ("…by day 28 it was worth a million"), then rewind. No "explaining the rules" scene.
4. **6–10 s, first escalation:** something visibly changes (a counter jumps, a stamp slams, a character transforms) by second 8.
5. **Every 3 s:** a visual change (cut, counter, stamp, emoji burst or camera punch), so there is no static stretch.
6. **Persistent on-screen stake:** a counter or meter stays visible for most of the video so viewers keep watching to see where it lands.
7. **Ending:** a twist, then the opening title card again (loop), plus a comment question.
8. **Topics:** pick from the search-demand list above, or proven money "what if" formats.

## 3. Proposed pipeline upgrades

**A. Story lint (blocking QA check).** A new check fails a story if:
- the total runs past 45 s, or any scene runs past 4 s;
- scene 1 has no hook title card;
- the open loop / payoff isn't by 6 s;
- 3 or more seconds pass with no visual event.

It also replaces the current over-strict "Mayor must appear" casting rule.

**B. Character animation upgrades** (in `CharacterManager.ts`):
- **Talking mouths:** the speaking character's mouth opens and closes on the narration's word timings. A new `speaker` field on each scene says who is talking.
- **Squash-and-stretch pop:** a character pops when they appear or change pose or expression, instead of switching instantly.
- **Anticipation and settle:** a small overshoot on big reactions (surprised, celebrating).

**C. Motion and graphics:**
- **Animated title card:** the hook card slams in with a bounce instead of appearing static.
- **Counter "tick" pulse:** the counter pulses each time the value jumps.
- **Persistent counter:** an option to keep the counter on screen across scenes.

**D. Captions:** keep the big karaoke style. Add a pop-in for the highlighted keyword. Long words auto-shrink so they never clip at the screen edges, which happened in the preview renders.

## 4. First video on v3

**"What If You Woke Up With 500 IQ?"** It matches the autocomplete demand ("what if you have 500 iq").
- **World:** reuse the existing city world.
- **Length:** 30–35 s.
- **On-screen stake:** an IQ meter on screen the whole time (100 → 500).
- **Payoff in the first 3 s:** "by lunch he'd fixed the economy… by dinner nobody would talk to him."

The repo already has an `infiniteIqStory.ts` (≈60+ s, 1,168 lines), probably from another session. v3 would be a new, shorter story built to the rules above, rather than an edit of that file.
