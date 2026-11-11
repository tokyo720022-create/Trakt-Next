# Trakt Next

An Android app that tracks Movies, TV Shows and Anime in separate sections and keeps Trakt, Simkl and AniList in sync.

Built with plain JavaScript wrapped in [Capacitor](https://capacitorjs.com). No bundler: `boot.js` loads the screens and scripts in order.

## Screens

| Tab | What it does |
| --- | --- |
| Home | Continue Watching (tick the next episode), Start Watching (your watchlist), daily streak, Calendar, Recommended, History. Switch between Media, Anime, Shows and Movies |
| Anime / Shows / Movies | Your list with status chips (All, Watched, Watchlist, Rated), Search, Filter, Customise and Custom lists |
| Discover | Trending, Popular, Anticipated, For you and search |
| Profile | Account, counts per section, sync routes, log out |

Tap any title to change it on Trakt: watchlist, watched (movies), rating, add to a custom list. Anime is any title Trakt gives the `anime` genre.

## Sync routes

| Section | Synced to |
| --- | --- |
| Movies | Trakt, Simkl |
| TV Shows | Trakt, Simkl |
| Anime | Trakt, AniList, Simkl |

Trakt works now. Simkl and AniList are not connected yet.

## Status

Version 0.2.

- [x] Log in with Trakt (OAuth with PKCE, no client secret)
- [x] Home, section lists, Discover, Profile
- [x] Search, Filter, Customise, Custom lists
- [x] Watchlist, watched, rating, custom list changes sent to Trakt
- [ ] Simkl login and sync
- [ ] AniList login and sync
- [ ] Episode-by-episode tracking inside a show
- [ ] Offline queue for changes that could not be sent

## Project structure

```
.github/workflows/   build-apk.yml, unpack-site.yml
android-signing/     patch-android.sh, verify-apk.sh, fingerprint.txt
resources/           icon.png (app icon and splash source)
tests/               check-structure.js, unit/
css/                 base.css, components.css, screens.css
views/
  shell/             header, tabs
  screens/           login, home, lists, discover, profile
  sheets/            filter, customise, customlists, streak, item
js/
  core/              core, auth, trakt, tabs, start
  features/          cards, lists, list-options, customlists, item-sheet,
                     discover, streak, home, profile
index.html
boot.js
package.json
capacitor.config.json
PRIVACY.md  CONTRIBUTORS.md  LICENSE  README.md
```

## Setup

### 1. Trakt developer app

Create an app at [developer.trakt.tv](https://developer.trakt.tv/apps):

- App type: Development (switch to Production when publishing)
- Redirect URI: `traktnext://callback`

The app signs in with PKCE, so Trakt does not issue a client secret.

### 2. GitHub secrets

Repository Settings, Secrets and variables, Actions:

| Secret | What it is |
| --- | --- |
| `TRAKT_CLIENT_ID` | Client ID of your Trakt app |
| `SIMKL_CLIENT_ID` | Client ID of your Simkl app (when Simkl is added) |
| `ANDROID_KEYSTORE_BASE64` | Your signing keystore, base64 encoded on one line |
| `ANDROID_KEYSTORE_PASSWORD` | Password of that keystore |

Keep the keystore and its password private and backed up. Never commit them. If the key is lost, new builds cannot be installed over old ones.

`android-signing/fingerprint.txt` holds the SHA-256 fingerprint of your signing key. The build fails if the APK is signed with a different key.

## Build and release

- **Build APK** runs on every push to `main` (or by hand). It runs the quick checks, builds a signed APK and publishes it as a new GitHub release.
- **Unpack site.zip**: push a `site.zip` with the app folders (`index.html`, `boot.js`, `css`, `js`, `views`, `tests` and the docs). A folder that is in the zip replaces the same folder in the repo, so old files never pile up. It refuses `package.json`, `capacitor.config.json`, `android-signing/` and workflow files, which are changed by hand.

## Privacy

See [PRIVACY.md](PRIVACY.md). Login tokens stay in the app's own storage, and Android backup is off.

## Contributing

See [CONTRIBUTORS.md](CONTRIBUTORS.md).

## License

[MIT](LICENSE)

_Trakt Next uses the Trakt API but is not endorsed or certified by Trakt. Trakt, Simkl and AniList are trademarks of their owners._
