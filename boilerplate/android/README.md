# Android prototype

This directory builds the smallest useful phone experiment:

- one bundled periodic wallpaper
- GLES 3 fullscreen rendering
- one-finger drag to pan through the wallpaper
- two `float` values for pan state
- wallpaper source in `wallpapers/ConwayWallpaper.idric`

There is deliberately no pinch, rotation, color gesture, form deformation, wallpaper picker, or Android live-wallpaper service in this APK.

The build down-compiles the `.idric` source to GLSL ES and packages the generated fragment shader as an Android asset. The build fails if that Edric path fails.

CI installs the debug APK in a phone-sized emulator, captures a frame, performs a one-finger swipe, captures another frame, and requires the rendered image to change.

Run Gradle from the repository root with `gradle -p boilerplate/android :app:assembleDebug`.

The maintained C translation unit uses `÷` and is compiled directly by ICK.
The shared `ai-ci/ick-android` source producer emits assembly; NDK tools assemble
that output, compile unchanged NativeActivity glue, and link each library.
The existing Android hardening flags, API 26 floor and three ABI payload remain.

The APK and unsigned-release workflows qualify one pinned ICK compiler per ABI
and restore its executable stage under `build/ick/<abi>`. CMake reads the pinned
interface from `.ai-ci-ick/ick-android/OwnedC.cmake`. A direct local Gradle build
needs those same qualified stages and shared checkout first; it does not fall
back to stock C or rewrite the glyph source. Explicit CMake `ICK_COMPILER`,
`ICK_COMPILER_OPTIONS`, `ICK_TARGET_FLAGS`, `ICK_HEADER_TARGET`, and
`ICK_HEADER_OVERLAY` remain available for qualified local compilers.

Compiler and native-library build evidence is separate from the existing
emulator interaction checks and physical-device acceptance.
