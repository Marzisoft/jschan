This is a fork of jschan that will run on https://marzichan.org.  
Aside from many changes to theming, layout, and branding, it contains some functional tweaks, such as:
 - Improved docker support; meant to be run via docker in production
 - Tegaki replays that are paired with an image don't count towards the files-per-post limit
 - Adds a override for the legacy favicon (.ico), to get around scaling issues with generate-favicon
   - To use, place the desired legacy favicon in `gulp/res/icons/master.ico`
 - Adds a special filter to reduce certain types of spam
 - Adds an integrated [notifier system](https://github.com/Marzisoft/globalafk) which generates password-gated Atom feeds and sends Discord messages
 - Adds support for regex-based filters (Marzichan does not have user-created imageboards, so ReDoS is not a concern)
   - Format filter text as `r!/foo/gi` to use, where `foo` is the expression and `gi` are modifiers/"flags"
 - Adds Exif data stripping for files uploaded with posts
 - Replaces per-board banners with a global banner system, including the ability to add authorship/source info as tooltips
   - Currently no site UI for this; it's driven entirely by image and txt files added to `static/global-banner`

Included below is the upstream README.

---

# jschan

Anonymous imageboard software that doesn't suck.

Repo Mirror(s):
 - https://gitgud.io/fatchan/jschan
 - https://git.basedflare.com/fatchan/jschan

Contact the author:
 - [Session](https://getsession.org/): `051b2ff270769d20764fa1b8e6bc3240b0a3c28ffb3242e7cce60db479b23ef427`
 - Telegram: [t.me/basedflare](https://t.me/basedflare)
 - Email: see my gitgud profile


## Live instances (Unofficial)
 - 🇵🇹/🇧🇷 [ptchan](https://ptchan.org)
 - 🇺🇸 [zzzchan](https://zzzchan.xyz)
 - 🇺🇸/🇰🇷 [heolkek](https://heolkek.cafe)
 - 🇺🇸 [sportschan](https://sportschan.org)
 - 🇺🇸 [trashchan](https://trashchan.xyz/index.html)
 - 🇧🇷 [27chan](https://27chan.org)
 - 🇺🇸 [jaksoy.party](https://jaksoy.party)
 - 🇮🇹 [nuichan](https://niuchan.org)
 - And many more...

## Features
 - [x] Multiple language support (🇬🇧 🇵🇹 🇧🇷 🇷🇺 🇮🇹 🇪🇸)
 - [x] Optional user created boards
 - [x] Multiple files per post
 - [x] Antispam/Anti-flood & DNSBL
 - [x] 3 customisable inbuilt captchas + 3 third party captchas (hcaptcha, recaptcha, yandex smartcaptcha)
 - [x] Two factor authentication (TOTP) for accounts
 - [x] Manage everything from the web panel
 - [x] Granular account permissions
 - [x] Works properly with anonymizer networks (Tor, Lokinet, etc)
 - [x] Web3 integration - register, login, and sign posts with [MetaMask](https://metamask.io)
 - [x] [Tegaki](https://github.com/desuwa/tegaki) applet with drawing and replays
 - [x] [API documentation](https://fatchan.gitgud.site/jschan-docs/)
 - [x] Built-in webring (compatible w/ [lynxchan](https://gitlab.com/alogware/LynxChanAddon-Webring) & [infinity](https://gitlab.com/Tenicu/infinityaddon-webring))
 - [x] Beautiful bundled frontend with lots of themes and options, see below:

![screenshots](collage.gif "screenshots")

## License
GNU AGPLv3, see [LICENSE](LICENSE).

## Installation & Upgrading
See [INSTALLATION.md](INSTALLATION.md) for instructions on setting up a jschan instance or upgrading to a newer version.

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for changes between versions.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Related Projects

Official:
 - [fatchan/jschan-docs](https://gitgud.io/fatchan/jschan-docs/) - API Documentation for jschan ([gitgud pages](https://fatchan.gitgud.site/jschan-docs/#introduction))
 - [fatchan/jschan-api-go](https://gitgud.io/fatchan/jschan-api-go) - WIP Golang API Client for jschan ([gitgud pages](https://fatchan.gitgud.site/jschan-api-go/pkg/jschan/))
 - [jschan-antispam group](https://gitgud.io/jschan-antispam/) - Multiple projects that are compatible with jschan and implement more sophisticated antispam capabilities.

Unofficial: **Not guaranteed to work or be safe, use at your own risk.**
 - [globalafk](https://git.ptchan.org/globalafk/) - "A simple python script that sends ugly notifications when something happens on a jschan imageboard that you moderate."
 - [reporter](https://git.ptchan.org/reporter/) - news bot that fetches news from a provider and posts a snippet of it on a configurable board of a configurable jschan imageboard
 - [yacam](https://git.ptchan.org/yacam/) - a bot that tries to detect (dumb) spam on jschan imageboards and does something about it

## For generous people

Bitcoin (BTC): [`bc1q4elrlz5puak4m9xy3hfvmpempnpqpu95v8s9m6`](bitcoin:bc1q4elrlz5puak4m9xy3hfvmpempnpqpu95v8s9m6)

Monero (XMR): [`89J9DXPLUBr5HjNDNZTEo4WYMFTouSsGjUjBnUCCUxJGUirthnii4naZ8JafdnmhPe4NP1nkWsgcK82Uga7X515nNR1isuh`](monero:89J9DXPLUBr5HjNDNZTEo4WYMFTouSsGjUjBnUCCUxJGUirthnii4naZ8JafdnmhPe4NP1nkWsgcK82Uga7X515nNR1isuh)
