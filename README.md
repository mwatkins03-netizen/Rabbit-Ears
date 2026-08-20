# Rabbit Ears 2.0

Rabbit Ears 2.0 is a colorful, browser-based live television wall inspired by stacked mid-century TV cabinets. Seven live HLS streams play simultaneously, while any television can be selected, tuned, unmuted, or opened full screen.

The project is a completely static website. It has no backend, database, API keys, media proxy, or build step.

## Features

- Seven simultaneous live television screens
- Overlapping, responsive 3D television cabinet stack
- Full-screen playback with native video controls
- Six-card sports gallery connected to local broadcast affiliates
- Searchable and filterable 38-channel starter guide
- Channel up/down and numeric preset tuning
- Stream resolution, transfer-rate, and buffer metrics
- Local M3U playlist import
- Custom HLS/M3U8 feed support
- Keyboard controls and responsive mobile presentation
- Native Safari HLS playback with an hls.js fallback for other browsers

## Live feeds

Streams are requested directly from each station or CDN. Rabbit Ears 2.0 never ingests, records, proxies, or retransmits video.

The included feeds may be local-news or OTT streams rather than complete over-the-air simulcasts. Availability, programming, geographic restrictions, CORS policies, and stream URLs remain under the source provider's control and may change without notice.

Because seven HD streams can play concurrently, the TV wall can use substantially more bandwidth than a typical single-video player. All screens begin muted to comply with browser autoplay rules.

## Deploy to GitHub Pages

1. Create a new public GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Commit the files to the `main` branch.
4. Open **Settings → Pages** in the repository.
5. Under **Build and deployment**, select **GitHub Actions** as the source.
6. The included workflow will publish the site automatically.

After deployment, the site will be available at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

No configuration changes are required for a project-site URL because all application assets use relative paths.

## Run locally

Opening `index.html` directly may trigger browser restrictions on remote media. A local HTTP server is recommended:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Keyboard controls

| Key | Action |
| --- | --- |
| `0–9` | Enter a channel preset |
| `↑` / `↓` | Channel up or down |
| `Space` | Play or pause the selected screen |
| `M` | Mute or unmute the selected screen |
| `/` | Focus channel search |
| `Esc` | Exit full-screen playback |

## Puffer

[Puffer](https://puffer.stanford.edu/) is included as an external research-player link, not an embedded feed. Stanford serves Puffer through an authenticated WebSocket/Media Source Extensions client rather than a reusable HLS URL. Participation is restricted to eligible U.S. users in supported browsers, and Puffer's terms prohibit copying or rebroadcasting received programming.

## Project structure

```text
.
├── .github/workflows/pages.yml  # GitHub Pages deployment
├── .nojekyll                    # Serve files without Jekyll processing
├── app.js                       # TV wall, playback and controls
├── channels.js                  # Starter channel catalog
├── favicon.svg                  # Rabbit Ears icon
├── index.html                   # Application markup
├── starter-feeds.m3u            # Source playlist for the starter catalog
└── styles.css                   # Visual system and responsive layouts
```

## Rights and responsible deployment

A publicly accessible stream URL does not automatically grant redistribution rights. Review the terms and licensing of every feed before operating a public channel catalog. This project deliberately performs direct client playback and does not provide a retransmission service.

Rabbit Ears 2.0 is an independent interface and is not affiliated with the included broadcasters, CDNs, networks, or Stanford University.

