# Make the Android app (APK)

This turns the app into a real Android app you install from a file. It is the exact same app, wrapped so it runs as an app and can use the camera, location, and the call button.

## How it fits together

- The app on each phone talks to your one backend online. That is how 4 or 5 phones share the same reports and alerts.
- So you must deploy the backend first. See DEPLOY.md. You will get a link like `https://municipal-emergency-app.onrender.com`.
- The Android build is done in the cloud by GitHub. You do not need to install Android tools on your PC.

## Steps

1. Deploy the backend and copy its link. See DEPLOY.md.

2. Put this project on GitHub (same repo you used for deploy is fine).

3. Tell the build where your backend is.
   - In your GitHub repo, open Settings, then Secrets and variables, then Actions, then the Variables tab.
   - Click New repository variable.
   - Name it `BACKEND_URL` and set the value to your backend link.

4. Build the APK.
   - In your repo, open the Actions tab.
   - Choose the workflow named Build Android APK, then Run workflow.
   - Wait a few minutes. When it finishes, open the run and download the file named `town-emergency-apk`. Inside is `app-debug.apk`.

5. Install on the phones.
   - Send the APK to each phone, for example by WhatsApp or a USB cable.
   - Open it on the phone. Android will ask to allow installing from this source. Allow it, then install.
   - Open the app. It loads your backend and works like the website, as an app.

## The call button

The call button dials the town emergency contact, set to 03804326. When someone taps it, their own phone opens the dialer with that number. The call is placed from their phone. To change the number later, set `EMERGENCY_CONTACT_NUMBER` in the backend settings.

## What works in the app

- Sign up, sign in, report incidents with location and photo.
- Operators approve accounts and manage incidents.
- Admin sends alerts. Alerts show on the other phones while the app is open, including the full screen critical alert.
- The call button dials your number.

## What needs a later step

- Alerts when the app is closed. That needs push notifications through Firebase. It is a known next step and does not change the app you already have.
- Automatic SMS or calls sent by the app without tapping. That needs a paid SMS service and testing for Lebanese numbers.

## Change the app name or id

Open `capacitor.config.json`. `appName` is the name under the icon. `appId` is the package id, for example `com.solvenx.emergency`. Change them before building if you want.

## Build on your own computer instead (optional)

If you prefer to build locally, install Android Studio, then:

```
npm install
npx cap sync android
```

Open the `android` folder in Android Studio and press Run or Build APK. This downloads the Android tools the first time.
