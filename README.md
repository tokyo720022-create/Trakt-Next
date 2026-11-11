# Trakt Next

An Android app that tracks Movies, TV Shows and Anime in separate sections and keeps Trakt, Simkl and AniList in sync.

Built with plain JavaScript (ES modules) wrapped in [Capacitor](https://capacitorjs.com). No bundler.

## Sections and sync routes

Trakt is the main account. A change made in the app goes to Trakt and is then sent on:

| Section   | Synced to                  |
| --------- | -------------------------- |
| Movies    | Trakt, Simkl               |
| TV Shows  | Trakt, Simkl               |
| Anime     | Trakt, AniList, Simkl      |

An item counts as anime when Trakt gives it the `anime` genre.

## Status

Version 0.1, first model.

- [x] Log in with Trakt (OAuth with PKCE, no client secret)
- [x] Movies / TV Shows / Anime sections with history
- [x] Bottom navigation, Profile screen
- [ ] Simkl login and sync
- [ ] AniList login and sync
- [ ] Add and edit entries (ratings, history, watchlist) from the app
- [ ] Offline queue for changes that could not be sent
- [ ] Progress, Library and Social screens

## Project structure

```
.github/workflows/   build-apk.yml, unpack-site.yml
android-signing/     patch-android.sh, verify-apk.sh, fingerprint.txt
resources/           icon.png (app icon and splash source)
tests/               check-structure.js
css/                 style.css
js/
  app.js             entry point
  core/              Config, Storage, HttpClient, MediaKind
  services/          TraktAuth, TraktApi, SimklApi
  views/             BaseView, LoginView, HomeView, ProfileView
  ui/                BottomNav
  utils/             dom, pkce
index.html
package.json
capacitor.config.json
```

Every screen is a subclass of `BaseView`. Services are created once in `js/app.js` and passed to the views.

## Setup

### 1. Trakt developer app

Create an app at [developer.trakt.tv](https://developer.trakt.tv/apps) with:

- App type: Development (switch to Production when publishing)
- Redirect URI: `traktnext://callback`

The app signs in with PKCE, so Trakt does not issue a client secret.

### 2. GitHub secrets

In the repository, open Settings, Secrets and variables, Actions, and add:

| Secret                      | What it is                                         |
| --------------------------- | -------------------------------------------------- |
| `TRAKT_CLIENT_ID`           | Client ID of your Trakt app                        |
| `SIMKL_CLIENT_ID`           | Client ID of your Simkl app (when Simkl is added)  |
| `ANDROID_KEYSTORE_BASE64`   | Your signing keystore, base64 encoded on one line  |
| `ANDROID_KEYSTORE_PASSWORD` | Password of that keystore                          |

Keep the keystore and its password private and backed up. Never commit them. If the key is lost, new builds cannot be installed over old ones.

### 3. Signing fingerprint

`android-signing/fingerprint.txt` holds the SHA-256 fingerprint of your signing key. The build fails if the APK is signed with a different key.

## Build and release

- **Build APK** runs on every push to `main` (or by hand). It runs the quick checks, builds a signed APK and publishes it as a new GitHub release. The login deep link `traktnext://` is added to the Android manifest and Android backup is turned off.
- **Unpack site.zip**: push a `site.zip` with the app folders (`index.html`, `css`, `js`, `tests`) and it is unpacked into the repo, then a build starts. It refuses `package.json`, `capacitor.config.json`, `android-signing/` and workflow files, which must be changed by hand.

Install a release APK over the previous one. Same signing key and a rising version code make that work.

## Privacy

Login tokens are stored in the app's own storage only. Android backup is turned off so they are not copied off the phone.

## Credits

This product uses the Trakt API but is not endorsed or certified by Trakt. Trakt, Simkl and AniList are trademarks of their owners.

## License

[MIT](LICENSE)
