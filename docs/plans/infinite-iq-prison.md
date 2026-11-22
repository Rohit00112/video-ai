# Short Production: "What If You Had Infinite IQ In Prison?" (~47 s)

Fast-paced, high-engagement storytime Short adhering to `REFERENCE_STYLE_BIBLE_V3.md` and Three.js 3D Cel-shaded animation pipeline.

## Premise
Ravi is locked in prison with infinite IQ. On his first night, he counts 347 bricks through a tiny window using the acoustic echo of raindrops. By morning, he maps every guard routine and discovers the laundry room blind spot to walk out in 11 minutes. Instead of breaking out, he solves the warden's impossible brass puzzle box, predicts a guard's injury before it happens, and legally proves his innocence using 10-year cold case files. When the gates open and he walks free, the outside world talks so painfully slowly that he falls asleep mid-sentence on a park bench. After one week, he voluntarily returns to prison—the only place complex enough to keep his mind stimulated.

## Key Creative Choices
- **Hook (0–3.4s):** Barred cell framing Ravi under moonlight rain beam with bold `PRISON IQ: ∞ 🧠` card and chain emoji burst.
- **Visual Gauges & Overlays:**
  - `BRICKS COUNTED`: Live tick 0 → 180 → 347.
  - `ESCAPE TIME`: 60 → 11 MIN gauge locking with lightning bolts.
  - `BOREDOM LEVEL`: Climbs 20% → 100% with ZZZ thought bubble.
- **Dynamic 3D Environments (`PrisonEnvironmentManager.ts`):**
  - **Cell Zone:** High barred window with volumetric moonlight beam, stone walls, metal cot, and expanding rain puddle ripples.
  - **Laundry Zone:** Industrial washers, hampers, and sweeping searchlight with green "BLIND SPOT" safety zone.
  - **Warden's Office:** Mahogany desk, brass puzzle cube, chessboard, green banker's lamp, and 10-year cold case folders.
  - **Prison Gates:** Barbed wire walls, heavy sliding iron gates opening into golden sunlight.
  - **City Street:** Bus stop sign, bench, slow-ticking municipal clock (0.1x speed).
- **Audio & Lip Sync:**
  - ElevenLabs narration with per-character word alignment visemes for lively mouth animations.
  - Custom sound effects on key beats: `impact_boom`, `wood_snap`, `ding`, `ui_click`, `sigh_down`, `sparkle_chime`.

## Scene Breakdown (14 Scenes)
| # | Scene ID | Duration | Narration | Key Visuals & Pacing Device |
|---|---|---|---|---|
| 1 | `prison-01-hook` | 3.58s | "What if you had infinite IQ, but you were locked in prison?" | Barred cell framing Ravi, `PRISON IQ: ∞ 🧠` card |
| 2 | `prison-02-rain-bricks` | 4.69s | "On his first night, Ravi counted 347 bricks through the tiny window..." | Camera tilts up to barred window, `BRICKS COUNTED` 0→180 |
| 3 | `prison-03-rain-echo` | 1.81s | "...just by the echo of rain." | Water puddle ripples, gauge hits 347, droplet burst |
| 4 | `prison-04-guard-patrol` | 3.44s | "By morning, he'd memorized every guard's patrol and every lock..." | Guard pacing hallway, spinning lock blueprint thought bubble |
| 5 | `prison-05-blind-spot` | 2.60s | "...and the one blind spot behind the laundry room." | Sweeping red searchlight, safe green blind spot floor decal |
| 6 | `prison-06-eleven-minutes` | 1.90s | "He could have walked out in eleven minutes." | Smirking punch-in, `ESCAPE TIME: 11 MIN` gauge |
| 7 | `prison-07-smarter-move` | 2.83s | "Instead, he used his brain to do something smarter." | Warden's office, Ravi points to impossible puzzle box |
| 8 | `prison-08-puzzle-injury` | 3.90s | "He solved the warden's impossible puzzle, and predicted a guard's injury." | Brass puzzle snaps open, `SOLVED ✓` rubber stamp, warden shock |
| 9 | `prison-09-proven-innocent` | 3.53s | "Then proved his own innocence using clues missed for ten years." | Cold case file glowing with sparkles, `INNOCENT ✓` stamp |
| 10 | `prison-10-gates-open` | 1.81s | "The gates open. He walks free." | Massive iron gates slide open into golden morning sun |
| 11 | `prison-11-slow-motion` | 3.62s | "But outside, bus drivers, shopkeepers, even his own family..." | Municipal clock moving at 0.1x speed, citizen talking in slow-mo |
| 12 | `prison-12-falls-asleep` | 4.04s | "...all talk so slowly he falls asleep before they finish one sentence." | Ravi slumped on bench, `BOREDOM: 100%`, ZZZ thought bubble |
| 13 | `prison-13-turns-back-in` | 2.79s | "After one week, Ravi turns himself back in..." | Night rain, Ravi presses security intercom, `VOLUNTARY RETURN` |
| 14 | `prison-14-never-bored-loop` | 4.64s | "...not because he wanted prison, but because his brain was finally never bored." | Serene smile behind bars, brain emoji burst, looping back to hook |
