# Charcoal launch chrome

The NativeActivity explicitly uses shared Theme.Charcoal through a local
fullscreen alias. Four canonical resource files are copied byte-for-byte from
android-NDK 3e682fb1175beef5625dbd2418730220e49fc9bd. The existing Android resource
compiler packages them without a new framework or build system.

The wallpaper itself is mathematical artwork, so its background, motif colors,
shader, pan behavior and native subpixel export are unchanged. Application launch
windows and system bars default to charcoal independently of system night mode.
Package org.isomorphisms.conway, stable signer and versionCode1 are preserved.

Current-source signed builds, source-built shader/native checks and real Android
execution remain required. Existing API34 pan/replacement checks do not by
themselves prove API29, both system modes, startup/rotation or physical C67
acceptance. No release, merge or installed application replacement occurs here.
