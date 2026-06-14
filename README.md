# Golf Club of LA League App

Web app for the league: net-score standings with automatic card offs, automatic skins, and KP (closest to the pin) tracking with hole-in-one fund handling.

Hosted free on GitHub Pages. Data stored free in Supabase so you can enter scores from your phone and everyone can view results from any device.

## One-time setup (about 20 minutes)

### Step 1: Create the Supabase database (free)

1. Go to https://supabase.com and sign up (free).
2. Click "New project". Name it `golf-league`, set a database password (save it somewhere), pick the region closest to you, and create.
3. When the project finishes setting up, open **SQL Editor** in the left sidebar, click **New query**, paste the entire contents of `supabase/schema.sql` from this project, and click **Run**. You should see "Success".
4. Create your scorekeeper login: go to **Authentication > Users > Add user > Create new user**. Enter your email and a password. Check "Auto Confirm User". This is what you'll use to sign in to the app to enter scores. (Anyone can VIEW results without signing in.)
5. Get your connection details: go to **Project Settings (gear icon) > API**. Copy two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (a long string)

### Step 2: Put your connection details in the app

Open `src/config.js` in any text editor and replace the two placeholder values with your Project URL and anon key. Save the file. (The anon key is safe to publish; the database rules only allow signed-in users to write.)

### Step 3: Put the app on GitHub

1. Go to https://github.com and sign up if needed.
2. Create a new repository: click **+ > New repository**. Name it `golf-league`, keep it **Public** (required for free GitHub Pages), and create it.
3. Upload this project. Easiest path if you don't use git:
   - Install GitHub Desktop (https://desktop.github.com), sign in, clone your new empty repository, copy all files from this folder into it (including the hidden `.github` folder), then Commit and Push.
   - Or with git on the command line:
     ```
     cd golf-league-app
     git init
     git add .
     git commit -m "Golf league app"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/golf-league.git
     git push -u origin main
     ```
4. Turn on GitHub Pages: in your repository on github.com, go to **Settings > Pages**, and under "Build and deployment" set **Source** to **GitHub Actions**.
5. Go to the **Actions** tab. A "Deploy to GitHub Pages" run should be in progress (if not, push any small change or click "Run workflow"). When it finishes, your app is live at:
   `https://YOUR_USERNAME.github.io/golf-league/`

That's it. Bookmark the URL on your phone.

## Using the app

1. **Courses** (one time per course): add the course name, tee names (e.g., Black, Blue), and for each of the 18 holes its par and hole handicap (1 through 18, each used once). The app figures out the par 3s automatically.
2. **New event**: pick the course and date, number of groups and first tee time, 1st/2nd/3rd place money, the LA Cup points for each place (varies by player count), and the skins and KP pots.
3. **Score entry**: add each player's round: name (saved for next time), tees, course handicap, and all 18 hole scores. Gross and net update live.
4. **KP sheet**: a grid just like the paper sheet (par 3 rows, group columns). Enter each group's closest player, distance, and made par or not. The app finds the overall winner per hole and warns you if "made par" doesn't match the player's entered score.
5. **Results**: standings with card offs applied (marked with *), skins and payouts, KP winners and the hole-in-one fund contribution. Use the Print button for a paper copy. Share the page URL with the league; viewers don't need an account.

## League rules built in

- Net = gross minus course handicap. Lowest net wins.
- Ties broken by card off on gross scores: #1 handicap hole, then #2, and so on. Works for any number of tied players and always produces an outright order.
- Skins: birdie or better, unique lowest score on the hole across the whole field. Pot splits evenly across the total number of skins won, so a player who wins 2 skins gets 2 shares.
- KP: shortest measured distance across all groups per par 3. Pot splits evenly across par 3s that have a winner. A winner who missed par forfeits their share to the hole-in-one fund (the split doesn't change).

## Making changes later

Any push to the `main` branch automatically rebuilds and redeploys the site (takes about a minute, see the Actions tab).

To run the rules tests: `npm test`. To run the app locally: `npm install` then `npm run dev`.
