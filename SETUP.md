# MindFit App — Setup Guide

Follow these steps in order. Takes about 20–30 minutes total.

---

## Step 1: Install Node.js

Node.js is needed to run the app on your computer (for testing) and to deploy it.

1. Go to https://nodejs.org
2. Download and install the **LTS** version
3. Open Terminal and verify: `node --version` (should show v20 or higher)

---

## Step 2: Set Up Supabase (your database + login system)

1. Go to https://supabase.com and create a free account
2. Click **New Project**, give it a name like "mindfit", choose a region close to you, and set a database password (save this!)
3. Wait ~2 minutes for the project to be ready
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Open the file `supabase-setup.sql` from this folder, copy all the text, paste it into the SQL Editor, and click **Run**
6. You should see "Success. No rows returned."

---

## Step 3: Get Your Supabase Keys

1. In Supabase, go to **Settings** (gear icon) → **API**
2. Copy these 3 values — you'll need them in the next step:
   - **Project URL** (looks like `https://abcxyz123.supabase.co`)
   - **anon public** key (a long string starting with `eyJ...`)
   - **service_role** key (another long string — keep this private!)

---

## Step 4: Configure the App

1. In this folder (`mindfit-app`), find the file `.env.local.example`
2. Make a copy of it named exactly `.env.local` (no "example")
3. Open `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your anon key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your service role key...
```

---

## Step 5: Install and Run the App Locally

Open Terminal, navigate to this folder, and run:

```bash
cd "/Users/danieljacobsen/MindFit Claude.md/mindfit-app"
npm install
npm run dev
```

Open your browser to **http://localhost:3000**

---

## Step 6: Create Your Admin Account

1. With the app running, go to http://localhost:3000/signup
2. Sign up with **your own email address**
3. Go back to Supabase → **SQL Editor** → **New Query**, run this (replace with your email):
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```
4. Also add your email to the whitelist (or you can do this via the admin panel after logging in):
   ```sql
   INSERT INTO approved_emails (email, registered) VALUES ('your@email.com', true);
   ```
5. Refresh the app — you should now see "Admin" in the navigation bar

---

## Step 7: Deploy to the Internet (Vercel)

So your athletes can access it from anywhere:

1. Create a free account at https://github.com and push your code there:
   ```bash
   cd "/Users/danieljacobsen/MindFit Claude.md/mindfit-app"
   git init
   git add .
   git commit -m "Initial MindFit app"
   ```
   Then create a new repo on GitHub and push to it.

2. Go to https://vercel.com, sign in with GitHub, click **New Project**, and import your repo

3. In Vercel's project settings, go to **Environment Variables** and add the same 3 variables from your `.env.local` file

4. Click **Deploy** — your app will be live at a URL like `mindfit-app.vercel.app`

5. (Optional) Add a custom domain in Vercel → **Settings** → **Domains**

---

## How to Add a New Member

When someone pays on Skool:
1. Log into your MindFit app at your URL
2. Click **Admin** in the navigation
3. Enter their email address in the "Add New Member" box
4. Send them your signup link: `https://your-app-url.vercel.app/signup`
5. They sign up, and they're in!

---

## Questions?

The app is built with:
- **Next.js** — the web app framework
- **Supabase** — the database and login system
- **Vercel** — where the app is hosted

All three have good free documentation if you need to look anything up.
