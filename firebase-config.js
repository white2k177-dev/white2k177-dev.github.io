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
    
    // Show loading text if loader exists
    var loader = document.getElementById('systemLoader');
    if(loader) loader.style.display = 'flex';
    
    window.auth.signInWithPopup(provider).then((result) => {
        var user = result.user;
        
        // Fetch current bonus amount from settings
        window.database.ref('settings').once('value').then((snap) => {
            let settings = snap.exists() ? snap.val() : {};
            let signupBonus = settings.signupBonus ? parseInt(settings.signupBonus) : 0; 
            
            // Check database to see if user is actually new to our system
            window.database.ref(`users/${user.uid}`).once('value').then(userSnap => {
                let profileUpdates = {
                    name: user.displayName || "MVX User",
                    email: user.email || "No Email",
                    avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName || 'User'}`,
                    lastLogin: firebase.database.ServerValue.TIMESTAMP
                };

                // If completely new user in database, grant setup fields and Coin Bonus
                if (!userSnap.exists()) {
                    profileUpdates.coins = signupBonus;
                    profileUpdates.role = 'user';
                    profileUpdates.joinedAt = firebase.database.ServerValue.TIMESTAMP;
                    profileUpdates.followers = 0;
                    profileUpdates.following = 0;
                } else {
                    // Fallback: If user exists but somehow didn't get coins initialized
                    let existingData = userSnap.val();
                    if (existingData.coins === undefined || existingData.coins === null) {
                        profileUpdates.coins = signupBonus;
                    }
                }
                
                // Update final profile data
                window.database.ref(`users/${user.uid}`).update(profileUpdates);
            });
        });
    }).catch((error) => {
        if(loader) loader.style.display = 'none';
        alert("Google Sign-In Failed: " + error.message);
    });
};

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
