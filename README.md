# Airborne Puma

**Twelve missions behind enemy lines.** A remake of *Airborne Ranger* (MicroProse, 1987, Commodore 64), redrawn as modern pixel art in the original's tilted overhead view. The ranger is a puma and the enemy are wolves.

The Osprey flies you over the mission area. You drop three supply pods where you'll want them, then jump on the green light. On the ground the clock is running. Sneak or fight your way to the objective, do the job, and get back to the pickup before time runs out. There are twelve missions across desert, temperate and arctic zones, and every map is laid out new each time. Veteran rangers keep their rank, decorations and service record between missions, and a campaign plays all twelve in order.

**Classic** plays as the 1987 game did. **Field**, the default, adds a minimap, arrows to the targets, enemy awareness markers and other modern aids, each of which can be switched on or off.

![The title: the depot from the air, the Osprey crossing with a ranger just out under his parafoil, and the menu](screenshots/title.png)

![The fly-over: the arctic airfield at half scale, the Osprey over the fighters, three pods still to drop](screenshots/flyover.png)

![On the ground at the depot: the puma ranger at the wire below the fuel dump, tents, a sandbagged nest, wolf soldiers with their fields of view, and the HUD](screenshots/ground.png)

![The arctic airfield: the ranger between a turret and a tent, two parked fighters, wolf soldiers in the snow](screenshots/arctic.png)

![The veteran roster: portraits, ranks, ribbons, the last mission each flew, and the memorial](screenshots/roster.png)

## Play it online

[greykit.com/games/airbornepuma](https://greykit.com/games/airbornepuma/)

## Play it on your own computer

Airborne Puma is a web page. There is nothing to install and nothing to build, and once you have a copy it needs no internet connection: every picture is drawn and every sound synthesised in the page, and its two typefaces come with it.

1. **Download it.** On GitLab, use **Code → Download source code → zip**, or clone it:

   ```bash
   git clone https://gitlab.com/greykit-app/games/airborne-puma.git
   ```

2. **Unzip it**, if you downloaded the zip.
3. **Open `index.html`** in a desktop browser. Double-clicking it usually does it.

### What you need

- A **desktop or laptop** with a **keyboard**. A gamepad works too.
- A recent Chrome, Edge, Firefox or Safari.
- A browser window at least **760 × 480**. On a phone or a smaller window, the page shows a note instead of the game.
- Sound is optional: `M` turns it on and off.

The keys are listed in the game under **Help** (`?` on the title screen).

### If it doesn't start

Some browsers are strict about pages opened straight from disk. If you see a blank screen, or your rangers aren't remembered, serve the folder instead. From inside the game's folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static file server does the same job.

## Put it on your own website

The game is static files. Copy them to any web host that serves files, such as an ordinary web server, GitLab Pages, GitHub Pages or Netlify, and open the folder's address. It works at the site root or in any subfolder, because every path in it is relative.

**Upload these:**

| | |
|---|---|
| `index.html` | the page |
| `css/`, `js/`, `fonts/` | the game, its styles and its two typefaces (keep the font licence files with them) |
| `manifest.webmanifest`, `icon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` | the icons, and the manifest that lets a browser install it as an app |
| `og.png` | the picture shown when the link is shared |
| `LICENSE` | the MIT licence, which asks that it travel with copies |

**Leave out** `screenshots/`, `tools/`, the Markdown files, and anything starting with a dot (`.git`, `.gitlab-ci.yml` and so on). The game never loads them.

**Two things to change for your own address:**

- **Link previews.** The `og:image`, `og:url` and `twitter:image` tags near the top of `index.html` point at greykit.com. Change them to your own address, or a shared link will show greykit.com's card.
- **Caching.** Every script and stylesheet URL in `index.html` ends in `?v=` and a hash of the file. So a host or CDN can cache `css/` and `js/` for as long as it likes, as long as `index.html` itself isn't cached for long.

## Your saves

- Veteran rangers, the memorial, a mission in progress, your settings and the sound setting are kept **in your browser**, not in the game's folder.
- Another browser, the online version, or a different address (a different `localhost` port, say) each keep their own separate saves.
- Everything is stored under keys beginning `airbornepuma_`, so it won't collide with other pages on the same site.
- **Settings → Forget everything** erases all of it. It asks first.

## Credits

*Airborne Ranger* was designed by Lawrence Schick and programmed by Scott Spanburg, with graphics by Iris Leigh Idokogi and music by Ken Lagace, for MicroProse in 1987. Airborne Puma is not affiliated with MicroProse, and none of the original's code, art, sound or text is used. Everything here is drawn and synthesised in the page, the title march included. The briefings, the maps and the numbers are new, guessed where the 1987 manual is silent.

Typefaces: [Barlow Semi Condensed](https://fonts.google.com/specimen/Barlow+Semi+Condensed) and [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans), under the SIL Open Font License.

Built by [greykit.com](https://greykit.com/).

## License

MIT. See [LICENSE](LICENSE).
