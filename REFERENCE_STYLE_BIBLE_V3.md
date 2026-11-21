# REFERENCE STYLE BIBLE V3 — DATA-DRIVEN "WHAT IF" SHORTS (Tiny World Stories)

> Supersedes V2 for pacing, structure and hooks. V1/V2 still define the visual look (cel-shaded low-poly 3D worlds + 2D outlined stickman characters).
> Built from Tiny World Stories' own YouTube Studio data (20 Nov 2026). See `docs/upgrade-proposal-v3.md`.

## 0. Why V3 exists

- **Hooks work:** retention holds through the first 5 s.
- **The setup loses viewers:** 35–40 points of viewers leave **between 5 s and 10 s**, during the "explain the premise" scene (Work Smarter 122%→88%, Bamboo 104%→64%).
- **Long videos bleed:** 60 s+ videos lose most viewers before the end (Bamboo ends at 11%).
- **Every Short stalls at YouTube's ~1.3k first feed test.** Beating the 5–10 s drop is what unlocks wider distribution.
- **Search is ~2% of views.** The topic and the first second matter far more than tags.

## 1. Length and pace (hard rules, enforced by `storyLint`)

| Rule | Limit |
|---|---|
| Total length | 30–40 s target, **45 s max** |
| Scene length | ≤ 3.5 s target, **4.0 s max** |
| Visual event gap | Something changes on screen at least every **3 s** (cut, counter jump, stamp, emoji burst, camera punch, title card) |

## 2. Beat sheet (seconds)

1. **0–2 s, hook.** Strangest image of the story + bouncing title card (scene 1 `hud.topTitle`, ≤ 14 characters) + a one-line question.
2. **2–6 s, stakes and open loop.** State the payoff or twist up front ("by day 28 it passed a million", "by dinner nobody would talk to him"), then rewind. **No scene that just explains the rules.**
3. **6–10 s, first escalation.** A visible change by second 8: counter jump, stamp, transformation.
4. **10–30 s, rule of three.** Three escalating beats, each bigger than the last, with the persistent stake updating.
5. **Last 4–6 s, twist and loop.** The twist, then the opening title card again and a comment question ("which would you pick?").

## 3. Persistent stake

Keep one number or meter on screen for most of the video (`experimentOverlay.gauge`, now pulsing on every jump). Viewers stay to see where it lands.

## 4. Characters

- Same look: white round heads, bold ink outlines, pill torsos, stick limbs.
- **The speaker's mouth moves with the narration** (`speaker` on each scene).
- **Pose and expression changes pop** with squash-and-stretch and a small overshoot, never an instant switch.
- One recurring hero per story (Alex, Granny, Chloe…), named in the script, so series and callbacks are possible.

## 5. Text on screen

- **Title card:** yellow by default, slams in with a bounce, ≤ 14 characters + one emoji.
- **Captions:** 1–3 words, karaoke, 104 px. Long words auto-shrink so they never clip. Highlighted keywords pop in.
- Keep the top 8–20% of the frame for the title card or the counter, never both at once.

## 6. Topics (from YouTube autocomplete demand, Nov 2026)

what if you have 500 iq · what if you could freeze time · what if everyone disappeared · what if you were the last man on earth · what would happen if earth stopped spinning · what would happen if all bees disappeared · money "choose one" dilemmas (penny vs $1M: done).

## 7. Release

- Morning slot first (08:00 Nepal time = 10:15 Philippines, the top country), evening slot second.
- Judge each Short by **Stayed to watch** (target > 70%) and **retention at 10 s** (target > 90%), not by first-day views.

## 8. "Storytime" look (reference: Ricks Clips, "He Could Spot Winning Tickets Just by Looking", 63 s, 6.8M views)

Set `visualStyle: 'storytime'` and `captionStyle: 'storytime'` on the concept.

| Element | Reference | Pipeline setting |
|---|---|---|
| Narration | Calm storyteller, ~150 wpm, small pauses between lines | ElevenLabs `speed 0.95, stability 0.55, style 0.3`, `padAfterSeconds ≈ 0.32` (measured 153 wpm vs 187 before) |
| Captions | One spoken word at a time, sentence case with punctuation, white with black stroke, lower-middle | `StorytimeCaption`: 1-word chunks, case kept, held across short pauses |
| Mouths | Small, closed between words | Lip-sync from the narration loudness envelope (`mouthEnvelope`), small mouth shape |
| Look | Warm painterly light, soft contrast, vignette, warm-brown outlines | Storytime grade (+warmth, softer contrast, deeper vignette, soft glow) and `#3B2416` character ink |
| Framing | Medium close-ups on the hero | Cameras ~5.5–6.5 units from characters |
| Sound | Narration + soft music, no harsh effects | Harsh synthesized effects dropped; all effects fade in/out; music level glides between scenes |
| Overlays | No title cards, emoji bursts or stamps | Leave them out; a small diegetic counter is fine |
| Pacing lint | Up to ~63 s | Storytime limits: 65 s total, 5 s scenes, 3.5 s visual gaps, no hook card required |

**Known gap:** the reference uses painted 2D illustrations with real background depth-of-field. Our renderer uses procedural low-poly 3D, so it matches the warmth, framing, pacing, captions and audio, but not the painterly texture. Matching that exactly would need an illustration (image-generation) pipeline.
