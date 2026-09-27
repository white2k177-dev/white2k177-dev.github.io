/* ==========================================================================
   MVX STORE V5.6 - MAIN SYSTEM ARCHITECTURE
   ========================================================================== */

let userProfile = null; 
let currentUserAuth = null;
let currentGlobalLanguage = 'en';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined') {
        console.error("Critical Runtime Failure: Firebase Core SDK Missing inside main.js pipeline.");
        return;
    }

    const db = firebase.database();
    const auth = firebase.auth();

    // 1. Maintenance Mode
    db.ref('settings/maintenanceMode').on('value', (snapshot) => {
        const isMaintenanceActive = snapshot.val();
        if (isMaintenanceActive === true) {
            const currentRole = sessionStorage.getItem('mvx_role');
            if (currentRole !== 'owner') {
                alert("System Update: Server is undergoing maintenance.");
                sessionStorage.clear();
                auth.signOut().then(() => {
                    window.location.replace('login.html?error=maintenance');
                });
            }
        }
    });

    // 2. Language Dictionary (Fixed All Languages)
    const languageDictionary = {
        en: {
            storeTitle: "MVX STORE", loadingStore: "Loading Database...",
            catAll: "All", catTrending: "Trending", catPremium: "Premium",
            searchTitle: "Search", searchPrompt: "Type keyword to search",
            lblUploadApp: "Upload App", lblCoinBalance: "Coin Balance", lblSignOut: "Logout",
            navFiles: "Files", navModApp: "Mods", navSearch: "Search", navYou: "Profile",
            lblNotiTitle: "Notifications", langName: "English (Default)"
        },
        bn: {
            storeTitle: "এমভিএক্স স্টোর", loadingStore: "ডেটাবেস লোড হচ্ছে...",
            catAll: "সব", catTrending: "ট্রেন্ডিং", catPremium: "প্রিমিয়াম",
            searchTitle: "সার্চ করুন", searchPrompt: "খুঁজতে এখানে লিখুন",
            lblUploadApp: "অ্যাপ আপলোড", lblCoinBalance: "কয়েন ব্যালেন্স", lblSignOut: "লগআউট",
            navFiles: "ফাইল", navModApp: "মডস", navSearch: "সার্চ", navYou: "প্রোফাইল",
            lblNotiTitle: "নোটিফিকেশন", langName: "বাংলা (Bengali)"
        },
        es: {
            storeTitle: "TIENDA MVX", loadingStore: "Cargando Base de Datos...",
            catAll: "Todo", catTrending: "Tendencias", catPremium: "Premium",
            searchTitle: "Buscar", searchPrompt: "Escribe para buscar",
            lblUploadApp: "Subir App", lblCoinBalance: "Monedas", lblSignOut: "Cerrar sesión",
            navFiles: "Archivos", navModApp: "Mods", navSearch: "Buscar", navYou: "Perfil",
            lblNotiTitle: "Notificaciones", langName: "Español (Spanish)"
        },
        hi: {
            storeTitle: "एमवीएक्स स्टोर", loadingStore: "लोड हो रहा है...",
            catAll: "सभी", catTrending: "ट्रेंडिंग", catPremium: "प्रीमियम",
            searchTitle: "खोजें", searchPrompt: "खोजने के लिए टाइप करें",
            lblUploadApp: "ऐप अपलोड", lblCoinBalance: "सिक्के", lblSignOut: "लॉग आउट",
            navFiles: "फाइलें", navModApp: "मोड्स", navSearch: "खोज", navYou: "प्रोफ़ाइल",
            lblNotiTitle: "सूचनाएं", langName: "हिन्दी (Hindi)"
        },
        ar: {
            storeTitle: "متجر MVX", loadingStore: "جاري التحميل...",
            catAll: "الكل", catTrending: "رائج", catPremium: "مميز",
            searchTitle: "بحث", searchPrompt: "اكتب للبحث",
            lblUploadApp: "رفع تطبيق", lblCoinBalance: "عملات", lblSignOut: "تسجيل الخروج",
            navFiles: "ملفات", navModApp: "تطبيقات", navSearch: "بحث", navYou: "حسابي",
            lblNotiTitle: "إشعارات", langName: "العربية (Arabic)"
        }
    };

    window.changeSystemLanguage = function(langCode) {
        currentGlobalLanguage = langCode;
        const dict = languageDictionary[langCode] || languageDictionary['en'];
        
        if(document.getElementById('lblStoreTitle')) document.getElementById('lblStoreTitle').innerText = dict.storeTitle;
        if(document.getElementById('lblLoadingStore')) document.getElementById('lblLoadingStore').innerText = dict.loadingStore;
        if(document.getElementById('btnCatAll')) document.getElementById('btnCatAll').innerText = dict.catAll;
        if(document.getElementById('btnCatTrending')) document.getElementById('btnCatTrending').innerText = dict.catTrending;
        if(document.getElementById('btnCatPremium')) document.getElementById('btnCatPremium').innerText = dict.catPremium;
        if(document.getElementById('lblSearchTitle')) document.getElementById('lblSearchTitle').innerText = dict.searchTitle;
        
        const sp = document.getElementById('lblSearchPrompt'); 
        if(sp) sp.innerHTML = `<i class="fas fa-search-plus" style="font-size: 40px; margin-bottom: 15px; color: var(--border-color);"></i><h3>${dict.searchPrompt}</h3>`;
        
        if(document.getElementById('lblUploadApp')) document.getElementById('lblUploadApp').innerText = dict.lblUploadApp;
        if(document.getElementById('lblCoinBalance')) document.getElementById('lblCoinBalance').innerText = dict.lblCoinBalance;
        if(document.getElementById('lblSignOut')) document.getElementById('lblSignOut').innerText = dict.lblSignOut;
        if(document.getElementById('navFiles')) document.getElementById('navFiles').innerText = dict.navFiles;
        if(document.getElementById('navModApp')) document.getElementById('navModApp').innerText = dict.navModApp;
        if(document.getElementById('navSearch')) document.getElementById('navSearch').innerText = dict.navSearch;
        if(document.getElementById('navYou')) document.getElementById('navYou').innerText = dict.navYou;
        
        if(document.getElementById('currentLanguageLabel')) document.getElementById('currentLanguageLabel').innerText = dict.langName;

        document.getElementById('languageSelectModal').classList.remove('active');
    };

    // Theme Toggle Logic
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            document.getElementById('currentThemeLabel').innerText = newTheme === 'light' ? 'Light Mode' : 'Dark Mode';
            localStorage.setItem('mvx_theme', newTheme);
        });
        
        const savedTheme = localStorage.getItem('mvx_theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            document.getElementById('currentThemeLabel').innerText = savedTheme === 'light' ? 'Light Mode' : 'Dark Mode';
        }
    }

    // 3. User Auth Logic
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserAuth = user;
            db.ref(`users/${user.uid}`).on('value', (snap) => {
                if (snap.exists()) {
                    userProfile = snap.val();
                    document.getElementById('topLoginBtn').style.display = 'none';
                    const pBtn = document.getElementById('topProfileBtn');
                    pBtn.src = userProfile.avatarUrl || 'https://via.placeholder.com/40';
                    pBtn.style.display = 'block';

                    document.getElementById('youTabAvatar').src = userProfile.avatarUrl || 'https://via.placeholder.com/75';
                    document.getElementById('youTabName').innerText = userProfile.name || 'User';
                    document.getElementById('youTabEmail').innerText = userProfile.email || 'No Email';
                    
                    document.getElementById('navCoinDisplay').innerText = userProfile.coins || 0;
                    document.getElementById('menuCoinItem').style.display = 'flex';
                    document.getElementById('menuSignOutItem').style.display = 'flex';
                    document.getElementById('redeemBoxSection').style.display = 'block';

                    if (userProfile.role === 'owner' || userProfile.role === 'admin') {
                        document.getElementById('menuAdminPanelItem').style.display = 'flex';
                        document.getElementById('menuPublishItem').style.display = 'flex';
                    } else {
                        document.getElementById('menuAdminPanelItem').style.display = 'none';
                        document.getElementById('menuPublishItem').style.display = 'none';
                    }
                }
            });
        } else {
            currentUserAuth = null;
            userProfile = null;
            document.getElementById('topLoginBtn').style.display = 'block';
            document.getElementById('topProfileBtn').style.display = 'none';
            document.getElementById('menuCoinItem').style.display = 'none';
            document.getElementById('menuSignOutItem').style.display = 'none';
            document.getElementById('menuAdminPanelItem').style.display = 'none';
            document.getElementById('menuPublishItem').style.display = 'none';
            document.getElementById('redeemBoxSection').style.display = 'none';
        }
    });

    // 4. Edit Profile Logic
    window.editUserNamePrompt = function() {
        if (!currentUserAuth || !userProfile) return;
        let newName = prompt("Enter your new profile name:", userProfile.name);
        if (newName !== null && newName.trim() !== "") {
            db.ref('users/' + currentUserAuth.uid).update({ name: newName.trim() });
        }
    };

    // Direct Avatar Upload Logic
    const avatarUploader = document.getElementById('directAvatarUpload');
    if (avatarUploader) {
        avatarUploader.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(!file || !currentUserAuth) return;
            
            const status = document.getElementById('directAvatarStatus');
            status.innerText = "Uploading...";
            status.style.display = "block";
            status.style.color = "var(--warning)";
            
            const formData = new FormData();
            formData.append("image", file);
            
            fetch(`https://api.imgbb.com/1/upload?key=820eb9aa6a57f863045a52c1929efc9c`, {
                method: "POST",
                body: formData
            }).then(res => res.json()).then(json => {
                if(json.success) {
                    const newUrl = json.data.url;
                    db.ref(`users/${currentUserAuth.uid}`).update({ avatarUrl: newUrl }).then(() => {
                        document.getElementById('youTabAvatar').src = newUrl;
                        document.getElementById('topProfileBtn').src = newUrl;
                        status.innerText = "Avatar Updated!";
                        status.style.color = "var(--success)";
                        setTimeout(() => status.style.display = "none", 3000);
                    });
                } else {
                    status.innerText = "Upload Failed.";
                    status.style.color = "var(--danger)";
                }
            }).catch(() => {
                status.innerText = "Network Error.";
                status.style.color = "var(--danger)";
            });
        });
    }

    window.openMyUploadsIfAdmin = function() {
        const currentSessionRole = sessionStorage.getItem('mvx_role');
        if (userProfile && (userProfile.role === 'owner' || currentSessionRole === 'owner')) {
            if (typeof openMyUploadsModal === 'function') openMyUploadsModal();
        }
    };

    window.secureLogout = function() {
        if (confirm("Log out from your account?")) {
            sessionStorage.clear(); 
            auth.signOut().then(() => window.location.reload());
        }
    };

    // 5. Notifications Engine (With App Logo Support & Button)
    db.ref('system_broadcasts').limitToLast(20).on('value', async (snap) => {
        const container = document.getElementById('notificationInboxDisplay');
        const badge = document.getElementById('notiAlert');
        if (!container) return;

        if (!snap.exists()) {
            container.innerHTML = `<div class="noti-card"><p class="noti-msg" style="text-align:center;">No notifications.</p></div>`;
            if(badge) badge.style.display = 'none';
            return;
        }

        let notes = [];
        snap.forEach(c => notes.push(c.val()));
        notes.reverse();

        if(notes.length > 0 && badge && document.getElementById('notificationTabContent').style.display === 'none') {
            badge.style.display = 'block';
        }

        let html = '';
        for (let note of notes) {
            let borderCls = note.type === 'alert' ? 'system-alert' : '';
            let actionHtml = '';

            if (note.link && note.link.trim() !== "") {
                if (note.link.includes('details.html?id=')) {
                    const appId = note.link.split('=')[1];
                    let logoUrl = 'https://via.placeholder.com/40/121212/00e6b8?text=APP';
                    
                    // Fetch real App Logo from database
                    try {
                        const appSnap = await db.ref(`store_apps/${appId}`).once('value');
                        if(appSnap.exists()) logoUrl = appSnap.val().logoUrl || logoUrl;
                    } catch(e){}
                    
                    actionHtml = `
                        <div class="noti-app-preview">
                            <img src="${logoUrl}" class="noti-app-logo">
                            <a href="${note.link}" class="noti-action-btn"><i class="fas fa-eye"></i> View App</a>
                        </div>
                    `;
                } else {
                    // Regular Website Link
                    actionHtml = `<a href="${note.link}" target="_blank" class="noti-action-btn" style="background:var(--info); color:#fff;"><i class="fas fa-link"></i> View Link</a>`;
                }
            }

            html += `
                <div class="noti-card ${borderCls}">
                    <div class="noti-header">
                        <span class="noti-title">${note.title}</span>
                        <span class="noti-time">${note.timeString}</span>
                    </div>
                    <p class="noti-msg">${note.message}</p>
                    ${actionHtml}
                </div>
            `;
        }
        container.innerHTML = html;
    });

    window.clearLocalNotifications = function() {
        document.getElementById('notificationInboxDisplay').innerHTML = `<div class="noti-card"><p class="noti-msg" style="text-align:center;">Notifications cleared.</p></div>`;
        const badge = document.getElementById('notiAlert');
        if(badge) badge.style.display = 'none';
    };

    // 6. Redeem Code System
    window.executeRedeemProtocol = function() {
        const codeInput = document.getElementById('redeemInputCode').value.trim().toUpperCase();
        const statusLabel = document.getElementById('redeemStatusMsg');
        
        if (!codeInput) { statusLabel.innerText = "Please enter a code."; statusLabel.style.color = "var(--danger)"; return; }
        if (!currentUserAuth) { statusLabel.innerText = "Login required."; statusLabel.style.color = "var(--danger)"; return; }

        document.getElementById('btnClaimCode').innerText = "Wait...";

        db.ref(`redeem_codes/${codeInput}`).once('value').then(snap => {
            if (!snap.exists()) {
                statusLabel.innerText = "Invalid or expired code.";
                statusLabel.style.color = "var(--danger)";
                document.getElementById('btnClaimCode').innerText = "CLAIM";
                return;
            }

            let voucher = snap.val();

            db.ref(`users/${currentUserAuth.uid}/redeemed_history/${codeInput}`).once('value').then(hSnap => {
                if (hSnap.exists()) {
                    statusLabel.innerText = "You already used this code.";
                    statusLabel.style.color = "var(--danger)";
                    document.getElementById('btnClaimCode').innerText = "CLAIM";
                    return;
                }

                if (voucher.currentClaims >= voucher.maxClaims) {
                    statusLabel.innerText = "Code limit reached.";
                    statusLabel.style.color = "var(--danger)";
                    document.getElementById('btnClaimCode').innerText = "CLAIM";
                    return;
                }

                let updates = {};
                updates[`redeem_codes/${codeInput}/currentClaims`] = voucher.currentClaims + 1;
                updates[`users/${currentUserAuth.uid}/redeemed_history/${codeInput}`] = firebase.database.ServerValue.TIMESTAMP;

                if (voucher.rewardType === 'coins') {
                    let rewardAmt = parseInt(voucher.rewardValue);
                    let curCoins = userProfile.coins || 0;
                    updates[`users/${currentUserAuth.uid}/coins`] = curCoins + rewardAmt;
                    statusLabel.innerText = `Success! ${rewardAmt} Coins Added.`;
                } else if (voucher.rewardType === 'premium_bypass') {
                    if (voucher.rewardValue === 'ALL_APPS') {
                        updates[`users/${currentUserAuth.uid}/premium_all_access`] = true;
                        statusLabel.innerText = `Success! All Premium Apps Unlocked.`;
                    } else {
                        let appIds = voucher.rewardValue.split(',');
                        appIds.forEach(id => {
                            updates[`users/${currentUserAuth.uid}/unlocked_apps/${id}`] = true;
                        });
                        statusLabel.innerText = `Success! Premium App(s) Unlocked.`;
                    }
                }

                db.ref().update(updates).then(() => {
                    statusLabel.style.color = "var(--success)";
                    document.getElementById('redeemInputCode').value = '';
                    document.getElementById('btnClaimCode').innerText = "CLAIM";
                    setTimeout(() => statusLabel.innerText = "", 4000);
                });
            });
        });
    };

    // System Config Sync
    db.ref('settings').on('value', (snap) => {
        if (snap.exists() && snap.val().storeLogo) {
            const logo = document.getElementById('mainStoreLogo');
            if (logo) logo.src = snap.val().storeLogo;
        }
    });
});
