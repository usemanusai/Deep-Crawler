---
title: "Capturing Authenticated API Endpoints"
date: "2025-11-08T00:13:05 (UTC +01:00)"
source: gemini.google.com
---
## Q: 
![Uploaded image preview](blob:https://gemini.google.com/8e3cc9a7-7d09-4623-a50d-e974e7773456)

So I have a question from an working deep crawler that uses an Hyperbrowser SDK to navigate and capture any hidden API endpoints (from the outside)

  

The main web side version works correctly and always finds hidden API endpoints from any website using a combination of crawling and simulated user interactions to translate / convert this to API endpoints.

  

To my findings it works correctly, but it never uses an account / session on that target website to actually capture what is inside the website.

  

It only finds what is outside the website because the script only crawls when not logged in and this is why it is missing many important endpoints that I need to capture.

  

This is why I created the hybride chrome extension that allows me to connect it to the backend then use the same workflow directly in the browser to capture the API endpoints (while logged in to any account on the actual targeted website)

  

Now my main question is, is what I am saying true? Or is the outside enough to capture the same amounts and sorts of endpoints?

## A: 
Yes, what you are saying is **absolutely true**.

Your analysis is perfectly correct. Crawling a website from the "outside" (as an unauthenticated, public user) will **only** ever discover public-facing APIs. For any modern, non-trivial web application, this is just the tip of the iceberg.

Think of it as the difference between a building's lobby and the secure offices inside.

*   **Unauthenticated (The Lobby):** From here, you can only find the endpoints for the "public" actions:
    
    *   `POST /api/login`
        
    *   `POST /api/register`
        
    *   `POST /api/forgot-password`
        
    *   `GET /api/public/blog-posts`
        
*   **Authenticated (The Secure Offices):** This is where all the valuable functionality and data live. These endpoints are completely different and are **only** exposed to a browser session that has a valid authentication token (like a session cookie or a JWT in `localStorage`). These are the endpoints you're looking for:
    
    *   `GET /api/v1/user/dashboard`
        
    *   `PUT /api/v1/user/profile`
        
    *   `POST /api/v1/messages/send`
        
    *   `GET /api/v1/billing/history`
        

The "outside" is **not** enough because the server will simply reject any request to an authenticated endpoint that doesn't present the correct credentials. The application logic is fundamentally split.

* * *

### Your Hybrid Extension is the Right Solution

Your approach of creating a hybrid Chrome extension is the correct and most effective solution to this problem.

By running your discovery workflow _inside_ the browser, your extension's scripts execute within the context of the logged-in tab. This means that when your crawler simulates navigation or triggers network requests, those requests **automatically include the user's authentication tokens** (e.g., the cookies) just as if the user had clicked the button themselves.

This allows your DeepCrawler to see the application as a logged-in user and successfully capture all the internal, authenticated API endpoints you were missing.

Based on your screenshot, it looks like you're on the right track, though the tool timed out waiting for data. Are you successfully capturing the authenticated endpoints now, or are you running into new challenges with the extension-based approach?

## Q: 
Well, the extension is connected to the backend, but whatever I try the crawler never finds API endpoints inside a logged in browser, while it does perfectly using the server side (original version) find multiple API endpoints. The extension should be connected to a Playwright session inside the browser, but still following the same workflow as the hyperbrowser SDK version does.

## A: 
Ah, this is the key piece of information. This isn't just a simple setup; you're dealing with a fundamental (and very common) conflict between two different execution models.

The reason it's failing is that **an extension running _inside_ the browser and a Playwright script running _outside_ the browser are two completely different worlds.**

The server-side version works because the Hyperbrowser SDK (which uses Playwright) _is the one launching and controlling the browser_. It has total, low-level control and can use Playwright's `page.on('request', ...)` function to intercept every single network request _that its own browser instance makes_.

Your extension is failing because this model is now reversed, and that "Playwright session" concept is the source of the problem.

* * *

### The Core Problem: Where the "Network Catcher" Lives

1.  **Server-Side (Original):**
    
    *   `Node.js Backend` -> `Launches Playwright` -> `Controls a new Browser` -> `Uses Playwright API to catch requests`.
        
    *   The "catcher" is Playwright itself.
        
2.  **Extension-Side (Your Goal):**
    
    *   `User's Chrome Browser` -> `User is logged in` -> `Your Extension is running inside`.
        
    *   To capture network requests, the extension **cannot** use Playwright's APIs. It _must_ use the **Chrome Extension APIs**.
        
    *   The "catcher" must be a script _inside the extension_ (like `background.js`).
        

The "same workflow" cannot be followed. The server-side workflow relies on Playwright's `page.on('request')`, which **does not exist** for an extension trying to read traffic from a tab it didn't create.

Your backend at `localhost:3002` is timing out (as seen in the log) because it's waiting for the extension to send it a list of endpoints, but the extension has no idea how to capture them.

* * *

### 🔧 How to Fix This: The "Extension-Native" Way

You need to **stop thinking about Playwright** for the capture mechanism inside the extension. The extension must use its own tools. The correct tool for this is the `chrome.webRequest` API.

Here is your actionable troubleshooting plan. The error is 100% inside the extension's code, not the backend.

#### 1. Check the _Extension's_ Console (Not the Web Page)

This is the most important step. The errors for your extension are not in the `localhost:3002` console. They are in a hidden, separate console for the extension's background script.

1.  Type `chrome://extensions` into your browser's address bar.
    
2.  Find your DeepCrawler extension.
    
3.  Turn on "Developer mode" (usually a toggle in the top-right corner).
    
4.  Your extension will now have new links. Click on the link that says **"background.js"**, **"service worker"**, or **"Inspect views"**.
    
5.  A new DevTools window will pop up. **This is your extension's console.**
    
6.  Now, try to run the "Start Discovery" again from the `localhost:3002` tab.
    
7.  Watch the extension's console you just opened. You will almost certainly see errors here (e.g., "chrome.webRequest is not defined," "Permission denied," etc.).
    

#### 2. Check Your `manifest.json` for Permissions

For the `chrome.webRequest` API to work _at all_, your extension's `manifest.json` file **must** have these permissions. If it doesn't, the extension will fail silently, capturing _zero_ requests.

This is what it should look like (example for Manifest V3):

```json
{
  "manifest_version": 3,
  "name": "DeepCrawler Hybrid",
  "version": "1.0",
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "webRequest",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
``` 


*   **`"permissions": ["webRequest"]`**: This gives you permission to _use_ the API.
    
*   **`"host_permissions": ["<all_urls>"]`**: This is **CRITICAL**. It gives your extension permission to _read network data from any website_. Without this, it can't see the requests for `miniapps.ai` or any other site.
    

#### 3. The Correct Architecture

Your new workflow should be:

1.  User clicks "Start Discovery" on `localhost:3002`.
    
2.  The web page sends a message to your extension (e.g., "start crawling `miniapps.ai`").
    
3.  Your extension's `background.js` script receives this message.
    
4.  Your `background.js` script then activates its _own_ listeners, using `chrome.webRequest.onBeforeRequest.addListener(...)`.
    
5.  As your extension's _content scripts_ navigate the page (simulating clicks), the `background.js` listener captures all matching network requests.
    
6.  The extension collects these requests into a list.
    
7.  Finally, the extension sends this list back to your `localhost:3002` backend, which then displays them in the "Crawl Terminal."
    

The backend's role changes from _controller_ (using Playwright) to _orchestrator_ (just telling the extension what to do and receiving the results). The extension does all the real work.

What errors are you seeing in the **extension's background console** when you try to run a discovery?

