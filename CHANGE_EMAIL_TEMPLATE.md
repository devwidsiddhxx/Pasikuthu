# Step-by-Step Guide: Change Supabase Email Template

## Quick Steps to Change the Magic Link Email

### Step 1: Open Supabase Dashboard
1. Go to **https://supabase.com/dashboard**
2. Sign in with your account
3. Select your project (the one with your Supabase URL)

### Step 2: Navigate to Email Templates
1. In the left sidebar, click on **"Authentication"**
2. In the Authentication menu, click on **"Email Templates"** (it's a tab at the top)

### Step 3: Edit the Magic Link Template
1. You'll see a list of email templates
2. Find **"Magic Link"** in the list
3. Click on **"Magic Link"** to open it for editing

### Step 4: Update the Email Content

**Change the Subject:**
- Find the **"Subject"** field
- Replace it with: `Your Pasikuthu Donation Link`

**Change the Body:**
- Find the **"Body"** or **"Message"** field
- Replace the entire content with:

```
This link contains the donation food link. Please contribute how much ever you can.

Click this link to start contributing to food donations:
{{ .ConfirmationURL }}

Thank you for your contribution!
```

**Important:** Keep `{{ .ConfirmationURL }}` exactly as shown - this is the magic link that users will click.

### Step 5: Save Changes
1. Click the **"Save"** button (usually at the bottom or top right)
2. You may see a confirmation message

### Step 6: Test It
1. Go back to your app
2. Sign out if you're signed in
3. Enter an email and request a new magic link
4. Check your email - it should now show the new text!

## Alternative: If You See HTML Editor

If Supabase shows you an HTML editor instead of plain text, use this:

```html
<h2>Pasikuthu Donation Link</h2>
<p>This link contains the donation food link. Please contribute how much ever you can.</p>
<p><a href="{{ .ConfirmationURL }}">Click this link to start contributing to food donations</a></p>
<p>Thank you for your contribution!</p>
```

## Troubleshooting

**Can't find Email Templates?**
- Make sure you're in the correct project
- Look for "Authentication" → "Email Templates" or "Templates"

**Changes not showing?**
- Make sure you clicked "Save"
- Try requesting a new magic link (old emails won't change)
- Clear your browser cache if needed

**Still seeing old text?**
- Double-check you edited the "Magic Link" template (not "Confirm Signup" or others)
- Make sure `{{ .ConfirmationURL }}` is included - it's required for the link to work





