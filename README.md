# ⛏ Mine-Pac

> A Minecraft-themed Pac-Man game built with React + Vite — mine walls, craft items, survive the night.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?style=flat-square&logo=javascript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ What Makes This Different

This isn't just Pac-Man with a texture pack. Mine-Pac adds real Minecraft mechanics that change how you play:

| Feature | Description |
|---|---|
| 🧱 **Breakable Walls** | Mine dirt blocks by walking into them — 4 hits to break, drops ingredients |
| ☀️🌙 **Day/Night Cycle** | Every ~28 seconds the world goes dark; enemies get aggressive and Enderman teleports |
| ⚒️ **Crafting System** | Collect Wood, Stone, Iron, Diamond scattered in the maze and craft power-ups |
| 🔥 **Lava Hazards** | Lava tiles kill on contact — plan your route or craft a Shield |
| 💚 **Mob Drops + XP Orbs** | Eating a scared ghost triggers an explosion and drops floating XP orbs |
| 🔦 **Torch Glow Lighting** | 6 torches cast real light halos that punch through the night darkness overlay |
| 💥 **Creeper Explosions** | Eaten ghosts burst into an animated explosion sprite |

---

## 🛠️ Crafting Recipes

Open the crafting table with **[C]** during gameplay:

| Item | Recipe | Effect |
|---|---|---|
| 👟 Speed Boots | Wood ×2 + Stone ×1 | Move faster for 100 ticks |
| 🛡️ Shield | Iron ×2 + Stone ×1 | Block ghost hits + survive lava |
| ⛏️ Super Pickaxe | Diamond ×1 + Iron ×1 | Mine walls instantly |
| 👁️ Night Vision | Diamond ×2 | See through the night overlay |

---

## 🕹️ Controls

| Key | Action |
|---|---|
| `W A S D` / `Arrow Keys` | Move Steve |
| `Space` / `Enter` | Pause / Resume / Start |
| `C` | Open / Close Crafting Table |
| D-Pad (mobile) | On-screen touch controls |

---

## 🚀 Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/mine-pac.git
cd mine-pac

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📦 Deploy to GitHub Pages

```bash
# Install the deploy tool
npm install --save-dev gh-pages

# Add to package.json scripts:
# "predeploy": "npm run build"
# "deploy": "gh-pages -d dist"

# Also add to package.json (top level):
# "homepage": "https://yourusername.github.io/mine-pac"

# Deploy
npm run deploy
```

---

## 🧱 Project Structure

```
mine-pac/
├── src/
│   └── App.jsx          # Full game — sprites, AI, loop, crafting, effects
├── public/
├── index.html
├── vite.config.js
└── package.json
```

---

## 🗺️ Roadmap

- [ ] Random maze generation (infinite replayability)
- [ ] Sound effects via Web Audio API
- [ ] High score saved to localStorage
- [ ] Two-player mode
- [ ] Boss level — Ender Dragon every 3rd level
- [ ] Mobile haptic feedback

---

## 🤝 Contributing

Pull requests are welcome! If you add a feature, please update this README.

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<p align="center">Made with ⛏️ and React</p>
