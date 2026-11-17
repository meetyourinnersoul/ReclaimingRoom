// auth.js - Centralized Authentication System for Breathe & Reflect

// 1. Core Global Configuration
const GOOGLE_CLIENT_ID = "265811510977-m0v0ojp05a6i98r7rp35sc47p2j2o7qn.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

let tokenClient;
let currentAccessToken = null;

// 2. JWT Token Parser Engine
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch(e) {
        console.error("JWT Parsing failed:", e);
        return null;
    }
}

// 3. Central Response Handler
function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    if (responsePayload && responsePayload.given_name) {
        // Commit identity globally to browser storage
        localStorage.setItem('userWellnessName', responsePayload.given_name);
        
        // Dispatches a global event across the page
        window.dispatchEvent(new Event('authStatusChanged'));
        
        // Execute the global layout engine immediately if it exists
        if (typeof window.changeLanguage === 'function') {
            window.changeLanguage();
        }
    }
}

// 4. Request Google Drive Access Token
function requestDriveAccess(callback) {
    if (!tokenClient) {
        console.error("Token client not initialized yet.");
        return;
    }
    
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error("GSI Token Error:", resp.error);
            callback(null);
            return;
        }
        currentAccessToken = resp.access_token;
        callback(currentAccessToken);
    };

    // Requests an access token via interactive popup window
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

// 5. Dynamic Authentication UI Synchronization Engine
function renderGoogleAuthenticationUI() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        // Initialize identity configurations safely
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });

        if (google.accounts.oauth2 && !tokenClient) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: DRIVE_SCOPE,
                callback: '', 
            });
        }

        const btnTarget = document.getElementById("googleBtnContainer");
        let userSavedName = localStorage.getItem('userWellnessName');

        // FIX: If the name is the default guest placeholder, treat them as logged out in the navbar
        if (userSavedName === 'Mindful Achiever') {
            userSavedName = null;
        }

        if (btnTarget) {
            if (userSavedName) {
                // If a REAL Google account is logged in: Show greeting profile name and a clean logout element
                btnTarget.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; font-family: 'Quicksand', sans-serif; font-size: 0.95rem;">
                        <span style="font-weight: 600; color: var(--text-dark, #3a3a3a);">Hello, ${userSavedName}</span>
                        <button onclick="executeSignOutFlow()" style="background: none; border: none; color: var(--clay-red, #b8735d); cursor: pointer; font-weight: 600; text-decoration: underline; padding: 0; font-family: 'Quicksand', sans-serif; font-size: 0.95rem;">Logout</button>
                    </div>
                `;
            } else {
                // If logged out / Guest: Render standard Google Button profile wrapper layout
                btnTarget.innerHTML = ""; 
                google.accounts.id.renderButton(
                    btnTarget,
                    { theme: "outline", size: "medium", shape: "pill" }
                );
            }
        }
    }
}

// 6. Global Sign Out Flow Execution
window.executeSignOutFlow = function() {
    // Purge session variables from cache store mapping hooks
    localStorage.removeItem('userWellnessName');
    currentAccessToken = null;
    
    // Broadcast status shift to force all localized panel bindings to redraw
    window.dispatchEvent(new Event('authStatusChanged'));
    
    if (typeof window.changeLanguage === 'function') {
        window.changeLanguage();
    }
};

// Monitor current tab window events
window.addEventListener('authStatusChanged', renderGoogleAuthenticationUI);

// FIX 1: Cross-Tab/Cross-Page Realtime Synchronization Listener
// This instantly updates the UI if a user logs in or out on a completely different open tab!
window.addEventListener('storage', function(event) {
    if (event.key === 'userWellnessName') {
        renderGoogleAuthenticationUI();
        if (typeof window.changeLanguage === 'function') {
            window.changeLanguage();
        }
    }
});

// 7. Global Initialization Engine
function initializeAuthEngine() {
    // Polling setup specifically for checking when components.js finishes building the navigation bar
    let navigationChecks = 0;
    const checkNavbarSetup = setInterval(() => {
        navigationChecks++;
        const containerReady = document.getElementById("googleBtnContainer");
        const googleReady = typeof google !== 'undefined' && google.accounts;

        if (containerReady && googleReady) {
            clearInterval(checkNavbarSetup);
            renderGoogleAuthenticationUI();
        } else if (navigationChecks > 50) { // Extended safety window
            clearInterval(checkNavbarSetup);
        }
    }, 50);
}

// FIX 2: Bulletproof Script Pipeline Loading Strategy
if (typeof google === 'undefined' || !google.accounts) {
    // Look to see if a script node is already present in the header
    let existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    
    if (!existingScript) {
        existingScript = document.createElement('script');
        existingScript.src = "https://accounts.google.com/gsi/client";
        existingScript.async = true;
        existingScript.defer = true;
        document.head.appendChild(existingScript);
    }
    
    // Explicitly triggers setup the exact millisecond the browser finishes downloading the library
    existingScript.onload = initializeAuthEngine;
} else {
    // Google script was already present or fast-cached, jump directly into setup loop
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initializeAuthEngine);
    } else {
        initializeAuthEngine();
    }
}