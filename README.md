# Voice Blender — website

Summon your whole team of bots in one call.

Static site, no build step, hosted on GitHub Pages:

- `index.html` — page content and sections
- `style.css` — layout, glass panels, 3D tilt cards, responsive + reduced-motion styles
- `tour.js` — scroll-driven 3D tour (the main experience; three.js r169 pinned on jsDelivr)
- `vbscene.js` — shared 3D pieces (hero vortex, sound-wave bots)
- `hero3d.js` — 3D hero for the plain page ("Skip the 3D tour", reduced motion)
- `vortex2d.js` — 2D canvas hero, used when WebGL isn't available
- `mascots.js` — shared bot colors and 2D bot drawing (uses the rendered `assets/bots/bot-0..4.png`)
- `script.js` — nav, mobile menu, scroll reveal, tilt, parallax, call illustration
- `sound.js` — background music ("voices" by Rexlambo, CC BY 3.0, credited in the footer); starts on the first click, tap or key press, or from the Sound toggle; turning it off is remembered

Follow [@VoiceBlender](https://x.com/VoiceBlender).
