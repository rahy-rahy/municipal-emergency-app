# Deploy the backend online (Render)

This puts the app and its database on the internet with HTTPS, so phones can reach it from anywhere. The Android app will point to the URL you get here.

## Steps

1. Put this project in a GitHub repository.
   - Create a free account at https://github.com
   - Make a new repository, then upload this folder to it. You can use the GitHub website upload, or Git if you know it.

2. Create the service on Render.
   - Sign up at https://render.com (no credit card needed for the free tier).
   - Click New, then Blueprint.
   - Connect your GitHub and pick this repository.
   - Render reads `render.yaml` and creates two things for you: the web service and a PostgreSQL database, already wired together.
   - Click Apply and wait for the build to finish.

3. Get your link.
   - When it is live, Render shows an address like `https://municipal-emergency-app.onrender.com`.
   - The app builds its tables automatically on the first start.

4. Create your admin account.
   - In Render, open your web service, then the Shell tab.
   - Run this with your own values:
     ```
     ADMIN_EMAIL=you@yourtown.gov.lb ADMIN_PASSWORD='choose a strong password' ADMIN_NAME='Your Name' npm run create-admin
     ```
   - Now open the site and sign in with that email and password.

## Important notes

- The free database expires 30 days after you create it. It is for testing. For real use, open the database in Render and switch it to a paid plan so your data is kept.
- The free web service sleeps after 15 minutes and takes about a minute to wake. For a real emergency app, switch the web service to a plan that stays awake, about 7 dollars a month.
- A free Postgres that does not expire is available from https://neon.tech if you prefer. Set its connection string as `DATABASE_URL` on the web service instead of using the Render database.

## Settings already set for you

The blueprint sets production mode, HTTPS only cookies, demo mode off, and a strong random session secret. You can change the town name and emergency numbers in the web service environment settings.
