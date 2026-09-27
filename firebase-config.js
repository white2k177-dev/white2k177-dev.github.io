/* ==========================================================================
   MVX STORE V5.6 - FIREBASE CORE CONFIG & ADVANCED AUTONOMOUS AUTH INTERCEPTOR
   ========================================================================== */

var firebaseConfig = {
    apiKey: "AIzaSyAS3UXXrio_-c9uPbHwpDuTVrP-p8d903w",
    authDomain: "white-2k-17-v4.firebaseapp.com",
    databaseURL: "https://white-2k-17-v4-default-rtdb.firebaseio.com",
    projectId: "white-2k-17-v4",
    storageBucket: "white-2k-17-v4.firebasestorage.app",
    messagingSenderId: "180909174928",
    appId: "1:180909174928:android:148861a87d66c6980ca815"
};

window.firebaseConfig = firebaseConfig; 

// Initialize Firebase Pipeline Safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.database = firebase.database();
window.auth = firebase.auth();

/* ==========================================================================
   DIRECT GOOGLE LOGIN FUNCTION FOR LOGIN.HTML (With Coin Bonus Fix)
   ========================================================================== */
window.startGoogleLogin = function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    var loader = document.getElementById('systemLoader');
    var loaderText = document.getElementById('loaderText');
    if (loader) loader.style.display = 'flex';
    if (loaderText) loaderText.textContent = 'CONNECTING TO GOOGLE...';

    /*
     * Mobile browsers are much more reliable with redirect authentication
     * than popup authentication. We therefore use redirect on mobile and
     * keep popup for desktop. If a desktop popup is blocked/closed, we
     * automatically fall back to redirect instead of showing a hard error.
     */
    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobile) {
        if (loaderText) loaderText.textContent = 'REDIRECTING TO GOOGLE...';
        return window.auth.signInWithRedirect(provider).catch(function(error) {
            if (loader) loader.style.display = 'none';
            console.error('Google redirect sign-in failed:', error);
            showLoginError(error);
        });
    }

    return window.auth.signInWithPopup(provider).then(function(result) {
        return finishGoogleProfile(result.user);
    }).catch(function(error) {
        console.warn('Google popup failed:', error);

        // Popup was closed/blocked. Use redirect as a safe fallback.
        if (
            error &&
            (
                error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/popup-blocked' ||
                error.code === 'auth/cancelled-popup-request'
            )
        ) {
            if (loaderText) loaderText.textContent = 'REDIRECTING TO GOOGLE...';
            return window.auth.signInWithRedirect(provider).catch(function(redirectError) {
                if (loader) loader.style.display = 'none';
                console.error('Google redirect fallback failed:', redirectError);
                showLoginError(redirectError);
            });
        }

        if (loader) loader.style.display = 'none';
        showLoginError(error);
    });
};

/* Complete profile setup after Google authentication. */
function finishGoogleProfile(user) {
    if (!user) return Promise.resolve();

    return window.database.ref('settings').once('value').then(function(snap) {
        var settings = snap.exists() ? snap.val() : {};
        var signupBonus = settings.signupBonus ? parseInt(settings.signupBonus, 10) : 0;

        return window.database.ref('users/' + user.uid).once('value').then(function(userSnap) {
            var profileUpdates = {
                name: user.displayName || "MVX User",
                email: user.email || "No Email",
                avatarUrl: user.photoURL ||
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=' +
                    encodeURIComponent(user.displayName || 'User'),
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            };

            if (!userSnap.exists()) {
                profileUpdates.coins = signupBonus;
                profileUpdates.role = 'user';
                profileUpdates.joinedAt = firebase.database.ServerValue.TIMESTAMP;
                profileUpdates.followers = 0;
                profileUpdates.following = 0;
            } else {
                var existingData = userSnap.val() || {};
                if (existingData.coins === undefined || existingData.coins === null) {
                    profileUpdates.coins = signupBonus;
                }
            }

            return window.database.ref('users/' + user.uid).update(profileUpdates);
        });
    });
}

/* Read the result after Google redirect returns to login.html. */
if (window.location.pathname.includes('login.html')) {
    window.auth.getRedirectResult().then(function(result) {
        if (result && result.user) {
            finishGoogleProfile(result.user).then(function() {
                console.log('Google redirect login completed.');
            }).catch(function(error) {
                var loader = document.getElementById('systemLoader');
                if (loader) loader.style.display = 'none';
                console.error('Profile setup failed:', error);
                showLoginError(error);
            });
        } else {
            var loader = document.getElementById('systemLoader');
            if (loader) loader.style.display = 'none';
        }
    }).catch(function(error) {
        var loader = document.getElementById('systemLoader');
        if (loader) loader.style.display = 'none';
        console.error('Google redirect result failed:', error);
        showLoginError(error);
    });
}

function showLoginError(error) {
    var message = (error && error.message) ? error.message : 'Google Sign-In failed.';
    var code = (error && error.code) ? error.code : '';

    // Keep technical detail in console; show a useful short message to users.
    if (code === 'auth/unauthorized-domain') {
        alert('Login is not enabled for this website domain. Add this domain to Firebase Authentication > Settings > Authorized domains.');
    } else if (code === 'auth/operation-not-allowed') {
        alert('Google Sign-In is disabled in Firebase Authentication.');
    } else {
        alert('Google Sign-In failed. Please try again.');
    }
}

/* ==========================================================================
   AUTH STATE OBSERVER & REAL-TIME SYNC
   ========================================================================== */
window.auth.onAuthStateChanged((user) => {
    if (user) {
        window.database.ref('settings').once('value').then((configSnap) => {
            let masterAdmins = {};
            
            if (configSnap.exists()) {
                masterAdmins = configSnap.val().masterAdmins || {};
            }

            window.database.ref(`users/${user.uid}`).once('value').then((userSnap) => {
                if (!userSnap.exists()) return;
                let userData = userSnap.val();
                let updates = {};

                // Auto-sync real name and email if it was missing previously
                if (userData.name === "MVX User" || !userData.email || userData.email === "No Email") {
                    if (user.displayName) updates['name'] = user.displayName;
                    if (user.email) updates['email'] = user.email;
                    if (user.photoURL) updates['avatarUrl'] = user.photoURL;
                }

                // Default Whitelisted Owner Emails
                const ownerEmails = [
                    "sktausif07ff@gmail.com", 
                    "sktausif771@gmail.com", 
                    "sktausifhhh@gmail.com", 
                    "white2k177@gmail.com"
                ];
                
                // Admin Security Clearance Check
                let isWhitelistedAdmin = ownerEmails.includes(user.email);
                if (!isWhitelistedAdmin) {
                    const safeEmail = user.email ? user.email.replace(/\./g, ',') : "";
                    if (safeEmail && masterAdmins[safeEmail]) {
                        isWhitelistedAdmin = true;
                    }
                }

                if (isWhitelistedAdmin && userData.role !== 'owner') {
                    updates['role'] = 'owner';
                    userData.role = 'owner';
                } 
                else if (!isWhitelistedAdmin && userData.role === 'owner') {
                    updates['role'] = 'user';
                    userData.role = 'user';
                }

                // Apply dynamic updates if necessary and route user
                if (Object.keys(updates).length > 0) {
                    window.database.ref(`users/${user.uid}`).update(updates).then(() => {
                        executeAccessControlRoutingRules(userData.role || 'user');
                    });
                } else {
                    executeAccessControlRoutingRules(userData.role);
                }
            });
        });
    } else {
        // User is logged out: Clear local session securely
        sessionStorage.removeItem('mvx_role');
        sessionStorage.removeItem('mvx_session');
    }
});

function executeAccessControlRoutingRules(role) {
    sessionStorage.setItem('mvx_role', role);
    sessionStorage.setItem('mvx_session', 'ACTIVE');

    const currentPathName = window.location.pathname;
    const isLandingOnLogin = currentPathName.includes('login.html');

    if (isLandingOnLogin) {
        if (role === 'owner') {
            window.location.replace('admin.html');
        } else {
            window.location.replace('index.html');
        }
    }
}
