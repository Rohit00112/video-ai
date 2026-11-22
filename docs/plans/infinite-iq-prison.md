# Short Production: "What If You Had Infinite IQ In Prison?" (~38 s)

High-engagement storytime Short adhering to `everyone-gone-v1.mp4` reference style and Blender 3D rigged chibi cast animation pipeline (`assets/characters/cast.blend`).

## Premise
Ravi is locked in prison with infinite IQ. On his first night, he counts 347 bricks through a tiny window using the acoustic echo of raindrops. By morning, he maps every guard routine and discovers the laundry room blind spot to walk out in 11 minutes. Instead of breaking out, he solves the warden's impossible brass puzzle box, predicts a guard's injury before it happens, and legally proves his innocence using 10-year cold case files. When the gates open and he walks free, the outside world talks so painfully slowly that he falls asleep mid-sentence on a park bench. After one week, he voluntarily returns to prison—the only place complex enough to keep his mind stimulated.

## Style & Pipeline Reference (`everyone-gone-v1.mp4`)
- **Rigged Chibi 3D Cast (`assets/characters/cast.blend`):**
  - **Ravi:** Inmate jumpsuit (#347 orange), spiky hair, laser-focused expressions.
  - **Warden:** Stern authority in dark navy suit with officer cap.
  - **Guard:** Slate-blue security uniform with patrol cap.
  - **Mayor / Chloe:** Outside citizens talking in extreme slow motion.
- **Full 3D Character Motions & Acting:**
  - Real NLA action tracks: `Idle_Talking_Loop`, `G_think`, `G_point`, `G_hips`, `G_shrug`, `G_cheer`, `Walk_Loop`, `Walk_Formal_Loop`, `Sitting_Talking_Loop`, `Sitting_Idle_Loop`, `Interact`.
- **Per-Character Viseme Lip-Syncing:**
  - High-fidelity mouth shape animation driven by ElevenLabs character-level timestamp alignments (`computeVisemeTrack`).
- **Cinematic 3D Cel-Shaded Sets (`toonsets.py`):**
  - **Cell:** Stone walls, high barred window, iron bars, metal cot, brick stack.
  - **Laundry:** Industrial washers with round glass doors, laundry hampers with jumpsuits.
  - **Warden's Office:** Executive wood paneling, mahogany desk, banker's lamp, bookshelf, brass puzzle cube.
  - **Prison Gates:** Concrete watchtower pillars, double sliding iron gates with hazard stripes, intercom buzzer.
  - **City Street & Park:** Sidewalk, slow municipal clock prop (0.1x speed), park bench.
- **Camera & Lighting:**
  - Dynamic 3D camera dollies with depth of field focusing on character faces (`dof: { char: 'ravi' }`).
  - Time-of-day grading: atmospheric `night` rain grade vs bright golden `day` daylight.
- **Compositing & Post (Remotion):**
  - Snappy word-by-word karaoke captions with keyword highlighting.
  - Sound effects on every major action beat (`impact_boom`, `wood_snap`, `ding`, `ui_click`, `sigh_down`, `sparkle_chime`).
  - Dynamic HUD gauges (`BRICKS COUNTED`, `ESCAPE TIME`, `BOREDOM LEVEL`) and rubber stamps (`SOLVED ✓`, `INNOCENT ✓`, `VOLUNTARY RETURN`).

## Scene Breakdown (11 Scenes)
| # | Scene ID | Duration | Set / Lighting | Narration | Key Visuals & Pacing Device |
|---|---|---|---|---|---|
| 1 | `prison-01-hook` | 3.4s | `prison` (night) | "What if you had infinite IQ, but you were locked in prison?" | Barred cell framing Ravi, `PRISON IQ: ∞ 🧠` card |
| 2 | `prison-02-rain-bricks` | 4.2s | `prison` (night) | "On his first night, Ravi counted 347 bricks through the tiny window, just by the echo of rain." | Low angle looking up at window, `BRICKS COUNTED: 0 → 347` |
| 3 | `prison-03-guard-patrol` | 4.2s | `laundry` (day) | "By morning, he'd memorized every guard's patrol, every lock, and the one blind spot behind the laundry room." | Guard pacing corridor, safe green blind spot |
| 4 | `prison-04-eleven-minutes` | 2.2s | `prison` (day) | "He could have walked out in eleven minutes." | Smirking hero punch-in, `ESCAPE TIME: 11 MIN` gauge |
| 5 | `prison-05-puzzle-injury` | 4.4s | `office` (day) | "Instead, he used his brain to do something smarter. He solved the warden's impossible puzzle, and predicted a guard's injury." | Brass puzzle box snaps open, `SOLVED ✓` rubber stamp, warden shock |
| 6 | `prison-06-proven-innocent` | 3.8s | `office` (day) | "And proved his own innocence using clues everyone else had missed for ten years." | Cold case folder in hand, `INNOCENT ✓` stamp |
| 7 | `prison-07-gates-open` | 2.2s | `gates` (day) | "The gates open. He walks free." | Massive iron gates slide open into golden morning sun |
| 8 | `prison-08-slow-motion` | 3.6s | `street` (day) | "But outside, bus drivers, shopkeepers, even his own family..." | Municipal clock moving at 0.1x speed, citizen talking in slow-mo |
| 9 | `prison-09-falls-asleep` | 3.6s | `park` (day) | "...all talk so slowly he falls asleep before they finish one sentence." | Ravi slumped on bench, `BOREDOM: 100%`, ZZZ bubble |
| 10 | `prison-10-turns-back-in` | 2.8s | `gates` (night) | "After one week, Ravi turns himself back in..." | Night rain, Ravi presses security intercom buzzer, `VOLUNTARY RETURN` |
| 11 | `prison-11-never-bored-loop` | 4.0s | `prison` (night) | "...not because he wanted prison, but because it was the only place where his brain finally wasn't bored." | Serene smile behind bars, brain emoji burst, looping back to hook |
