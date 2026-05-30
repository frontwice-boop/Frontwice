# Frontwice Android Developer Guide

This application has been fully converted into a hybrid Android App using **CapacitorJS**. You can run the entire mobile platform natively on your physical Android device or emulator of choice.

## Prerequisite Tools
1. **Android Studio** (Koala or newer recommended)
2. **Android SDK & Platform Tools** configured with your device (Developers mode enabled on physical phone via USB debugging).

---

## 🚀 How to Sync & Run the Android App

### 1. Synchronize the Web Build to the Android Project
Whenever you modify your React codebase in the editor, run this compiled bundle synchronization command from the project root:
```bash
npm run android:sync
```
This script compiling-builds your frontend assets via Vite to `/build_output` and synchronizes all assets into the native Android application resources.

### 2. Open the Project in Android Studio
To open, run, or debug the native project structure in Android Studio, run:
```bash
npm run android:open
```
This command triggers the Capacitor interface, which automatically opens the `/android` folder inside Android Studio.

### 3. Build & Run from Android Studio
Once Android Studio has indexed the gradle file (takes about 1 minute on first launch):
1. Connect your physical Android phone (ensure USB debugging is active) or boot a Pixel Virtual Emulator.
2. Select your target device in the device manager dropdown.
3. Click the green **Run (Play)** button in the top navigation panel.
4. Android Studio compiles the APK and installs/launches the app automatically!

---

## 🛠️ Debugging Native Android Web Views

To view logs, inspect markup, and track styles directly from your computer while the app is running on your phone:
1. Open Google Chrome on your development computer.
2. Navigate to: `chrome://inspect/#devices`
3. Locate your connected Android device in the list.
4. Find **Frontwice** and click **Inspect**.
5. This opens a dedicated DevTools window targeting your live Android phone viewport!
