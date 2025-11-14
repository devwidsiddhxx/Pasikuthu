# How to Change Supabase Email Template

To customize the magic link email that users receive, follow these steps:

## Steps:

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication → Email Templates**
   - Click on "Authentication" in the left sidebar
   - Click on "Email Templates" tab

3. **Edit the Magic Link Template**
   - Find the "Magic Link" template
   - Click "Edit" or the template name

4. **Update the Email Content**
   Replace the default message with:

   **Subject:** `Your Pasikuthu Donation Link`

   **Body:**
   ```
   This link contains the donation food link. Please contribute how much ever you can.
   
   Click this link to start contributing to food donations:
   {{ .ConfirmationURL }}
   
   Thank you for your contribution!
   ```

5. **Save the Template**
   - Click "Save" to apply changes

## Alternative: Using HTML Template

If you want a more styled email, you can use HTML:

```html
<h2>Welcome to Pasikuthu</h2>
<p>This link contains the donation food link. Please contribute how much ever you can.</p>
<p><a href="{{ .ConfirmationURL }}">Click here to start contributing to food donations</a></p>
<p>Thank you for your generosity!</p>
```

## Note:
- The `{{ .ConfirmationURL }}` variable is required - it's the magic link URL
- Changes take effect immediately for new emails
- You can preview the template before saving

