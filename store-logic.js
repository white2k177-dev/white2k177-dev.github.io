/* ==========================================================================
   MVX STORE V5.6 - CORE DATA ENGINE & ADVANCED UPLOAD PROTOCOL (FINAL LINK SYNC)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined') {
        console.error("Firebase Core SDK Critical Error: Architecture links dropped.");
        return;
    }

    const db = firebase.database();
    const auth = firebase.auth();
    
    let currentUser = null;
    let userProfile = null;
    let activeContentType = 'mod_app';
    let activeFilterType = 'all';    

    const IMGBB_API_KEY = "820eb9aa6a57f863045a52c1929efc9c"; 

    // ==========================================================================
    // 1. DYNAMIC UI INJECTION FOR "MY UPLOADS" (Only for Admins)
    // ==========================================================================
    const menuList = document.querySelector('.you-menu-list');
    if (menuList && !document.getElementById('menuMyUploadsItem')) {
        const myUpBtn = document.createElement('div');
        myUpBtn.className = 'you-menu-item';
        myUpBtn.id = 'menuMyUploadsItem';
        myUpBtn.style.display = 'none'; // Hidden by default
        myUpBtn.onclick = function() { 
            if(typeof openMyUploadsModal === 'function') openMyUploadsModal(); 
        };
        myUpBtn.innerHTML = `
            <i class="fas fa-folder-open" style="color: var(--info);"></i>
            <span style="color: var(--info); font-weight: 700;">My Uploads</span>
            <i class="fas fa-chevron-right arrow"></i>
        `;
        menuList.insertBefore(myUpBtn, menuList.children[2] || menuList.firstChild);
    }

    // Disable Top Profile Icon Click Action completely
    window.openMyUploadsIfAdmin = function() {
        return false;
    };

    // ==========================================================================
    // 2. GLOBAL STORE BRAND LOGO SYNCHRONIZER
    // ==========================================================================
    db.ref('settings/storeLogo').on('value', (snapshot) => {
        const logoImg = document.getElementById('mainStoreLogo');
        if (logoImg && snapshot.exists() && snapshot.val().trim() !== "") {
            logoImg.src = snapshot.val();
        }
    });

    // ==========================================================================
    // 3. AUTH STATE TRIGGER & BACKGROUND CONTROLLERS
    // ==========================================================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            db.ref('users/' + user.uid).on('value', (snapshot) => {
                if (snapshot.exists()) {
                    userProfile = snapshot.val();
                    executeSystemInterfacePipelineUpdates();
                }
            });
            runSystemAutoApproveEngine();
            listenForLiveSystemNotifications();
        } else {
            currentUser = null;
            userProfile = null;
            listenForLiveSystemNotifications();
            
            const myUpBtn = document.getElementById('menuMyUploadsItem');
            if(myUpBtn) myUpBtn.style.display = 'none';
        }
    });

    // ==========================================================================
    // 4. SYSTEM INTERFACE PIPELINE ELEMENTS MANAGER
    // ==========================================================================
    function executeSystemInterfacePipelineUpdates() {
        if (!userProfile || !currentUser) return;

        // Admin Access Checks
        const isAdmin = (userProfile.role === 'owner' || sessionStorage.getItem('mvx_role') === 'owner');
        const myUpBtn = document.getElementById('menuMyUploadsItem');
        if(myUpBtn) {
            myUpBtn.style.display = isAdmin ? 'flex' : 'none';
        }

        // Fetching Real Google Account Details
        let realName = userProfile.name;
        if (!realName || realName === "MVX User") {
            realName = currentUser.displayName || "MVX User";
        }

        let realAvatar = userProfile.avatarUrl;
        if (!realAvatar || realAvatar.includes("dicebear")) {
            realAvatar = currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${realName}`;
        }

        // Updating UI Elements
        const tabName = document.getElementById('youTabName');
        const tabEmail = document.getElementById('youTabEmail');
        const tabAvatar = document.getElementById('youTabAvatar');
        const topProfilePic = document.getElementById('topProfileBtn');
        const coinDisplay = document.getElementById('navCoinDisplay');

        if (tabName) tabName.innerText = realName;
        if (tabEmail) tabEmail.innerText = userProfile.email || currentUser.email || "";
        
        // Exact Coin Balance Fix
        if (coinDisplay) {
            coinDisplay.innerText = userProfile.coins !== undefined ? userProfile.coins : 0;
        }

        if (tabAvatar) tabAvatar.src = realAvatar;
        if (topProfilePic) topProfilePic.src = realAvatar;
    }

    // ==========================================================================
    // 5. PLAY STORE DATA RENDERING GRID (LOAD BUG FIXED)
    // ==========================================================================
    window.loadStoreFeed = function(filter, contentType) {
        activeFilterType = filter || activeFilterType;
        activeContentType = contentType || activeContentType;

        const grid = document.getElementById('storeAppGrid');
        if (!grid) return;

        let activeLang = localStorage.getItem('mvx_lang') || 'en';
        let loadingMsg = "Scanning Database Infrastructure...";
        if(activeLang === 'bn') loadingMsg = "ডাটাবেজ কানেকশন চেক করা হচ্ছে...";

        grid.innerHTML = `
            <div style="text-align:center; padding: 50px; grid-column: 1/-1;">
                <i class="fas fa-spinner fa-spin" style="font-size:32px; color:var(--primary);"></i>
                <p style="margin-top:15px; color:var(--text-secondary); font-weight:500;">${loadingMsg}</p>
            </div>
        `;

        db.ref('store_apps').orderByChild('status').equalTo('approved').once('value').then((snapshot) => {
            if (!snapshot.exists()) {
                grid.innerHTML = `<div style="text-align:center; padding:50px; grid-column:1/-1; color:var(--text-secondary);">No applications live in database catalog.</div>`;
                return;
            }

            let html = '';
            let appsList = [];
            
            snapshot.forEach((child) => {
                appsList.push({ id: child.key, ...child.val() });
            });
            
            appsList.reverse();

            appsList.forEach((app) => {
                let matchType = (app.appType === activeContentType);
                let matchFilter = false;

                if (activeFilterType === 'all') matchFilter = true;
                if (activeFilterType === 'premium' && app.category === 'paid') matchFilter = true;
                if (activeFilterType === 'trending' && app.isTrending === true) matchFilter = true;

                if (matchType && matchFilter) {
                    const priceLabel = app.category === 'paid' ? `${app.coinPrice || 0} Coins` : (app.category === 'locked' ? 'LOCKED' : 'FREE');
                    const badgeClass = app.category === 'paid' ? 'badge-paid' : (app.category === 'locked' ? 'badge-locked' : 'badge-free');

                    html += `
                        <div class="app-card" onclick="window.location.href='details.html?id=${app.id}'">
                            <span class="badge ${badgeClass}">${priceLabel}</span>
                            <img src="${app.logoUrl}" class="app-icon-large" loading="lazy" onerror="this.src='https://via.placeholder.com/75/121212/00e6b8?text=FILE'">
                            <div class="app-info-list" style="width: 100%; word-wrap: break-word; white-space: normal;">
                                <h3 class="app-title-list" style="white-space: normal; overflow: visible; text-overflow: unset; line-height: 1.3; font-size: 17px;">${app.appName} <i class="fas fa-check-circle verified-tick" style="color:var(--primary); font-size:13px; margin-left:4px;"></i></h3>
                                <div class="app-dev-list">${app.developerName || app.uploaderName || "Developer"} • ${app.size || "0 MB"}</div>
                                <div class="app-meta-list">
                                    <span style="color:var(--primary); font-weight:700;"><i class="fas fa-arrow-alt-circle-down"></i> ${app.downloads || 0}</span>
                                    <span>v${app.version || "1.0"}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            grid.innerHTML = html || `<div style="text-align:center; padding:50px; grid-column:1/-1; color:var(--text-secondary);">No content found inside this layout card grid.</div>`;
        });
    };

    document.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            loadStoreFeed(e.target.getAttribute('data-filter'), activeContentType);
        });
    });

    // AUTO LOAD APPS ON START
    setTimeout(() => {
        if(typeof window.loadStoreFeed === 'function') {
            window.loadStoreFeed('all', 'mod_app');
        }
    }, 200);

    // ==========================================================================
    // 6. SMART TAGS FIELD ARRAY CONTROLLER CONTEXT
    // ==========================================================================
    let uploadedTagsList = [];
    
    function initializeTagsInputEngine() {
        const input = document.getElementById('tagInputField');
        const container = document.getElementById('tagsInputContainer');
        if(!input || !container) return;

        uploadedTagsList = []; 

        input.addEventListener('keydown', (e) => {
            if (e.key === ',' || e.key === 'Enter') {
                e.preventDefault();
                let tag = input.value.trim().toLowerCase().replace(/,/g, '');
                if (tag && !uploadedTagsList.includes(tag)) {
                    uploadedTagsList.push(tag);
                    renderTagsChipsInsideInputBox();
                }
                input.value = '';
            }
        });
    }

    function renderTagsChipsInsideInputBox() {
        const container = document.getElementById('tagsInputContainer');
        const input = document.getElementById('tagInputField');
        if(!container) return;

        container.querySelectorAll('.tag-chip').forEach(chip => chip.remove());

        uploadedTagsList.forEach((tag, index) => {
            let chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.innerHTML = `${tag} <i class="fas fa-times" onclick="removeSelectedTagChip(${index})"></i>`;
            container.insertBefore(chip, input);
        });
    }

    window.removeSelectedTagChip = function(index) {
        uploadedTagsList.splice(index, 1);
        renderTagsChipsInsideInputBox();
    };

    let uploadedScreenshotsList = [];

    // ==========================================================================
    // 7. MASTER PLAY STORE APPLICATION PUBLISH MODAL FORM LAYOUT
    // ==========================================================================
    window.openUploadModal = function() {
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        const isMasterOwner = (userProfile && userProfile.role === 'owner');
        uploadedScreenshotsList = []; 

        let categoryOptionsHTML = `<option value="free">Free</option>`;
        if (isMasterOwner) {
            categoryOptionsHTML += `<option value="paid">Premium</option>`;
            categoryOptionsHTML += `<option value="locked">Locked</option>`;
        }

        let encodingMethodsHTML = `<option value="imgbb">ImgBB Upload</option>`;
        if (isMasterOwner) {
            encodingMethodsHTML += `<option value="base64">Base64 Code</option>`;
        }

        let uploadModal = document.createElement('div');
        uploadModal.id = 'dynamicUploadModal';
        uploadModal.className = 'modal-overlay active';
        uploadModal.innerHTML = `
            <div class="play-modal" style="max-width: 550px;">
                <div class="modal-header">
                    <h3><i class="fas fa-upload" style="color:var(--primary);"></i> Upload New App</h3>
                    <i class="fas fa-times close-modal" onclick="document.getElementById('dynamicUploadModal').remove()"></i>
                </div>
                <div class="modal-body">
                    
                    <label class="modal-label">App Name</label>
                    <input type="text" id="pName" class="play-input" placeholder="Enter app name">

                    <label class="modal-label">Developer Name</label>
                    <input type="text" id="pDevName" class="play-input" placeholder="e.g. Tausif Modz V3">

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div>
                            <label class="modal-label">Version</label>
                            <input type="text" id="pVer" class="play-input" placeholder="e.g. 1.0">
                        </div>
                        <div>
                            <label class="modal-label">Size</label>
                            <input type="text" id="pSize" class="play-input" placeholder="e.g. 45 MB">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div>
                            <label class="modal-label">Select Tab</label>
                            <select id="pType" class="play-input">
                                <option value="mod_app">Mod App Tab</option>
                                <option value="files">Files Tab</option>
                            </select>
                        </div>
                        <div>
                            <label class="modal-label">Access Type</label>
                            <select id="pCat" class="play-input" onchange="toggleAccessTypeInputs(this.value)">
                                ${categoryOptionsHTML}
                            </select>
                        </div>
                    </div>

                    <div id="coinPriceWrapper" style="display:none;">
                        <label class="modal-label" style="color:var(--warning);">Coin Price</label>
                        <input type="number" id="pCoinPrice" class="play-input" placeholder="0" value="0">
                    </div>

                    <div id="videoLinkWrapper" style="display:none; margin-bottom: 15px;">
                        <label class="modal-label" style="color:var(--danger);">Unlock Video Link</label>
                        <input type="text" id="pVideoLink" class="play-input" placeholder="Paste YouTube/Tutorial link here" style="margin-bottom: 0;">
                    </div>

                    <div style="display:flex; gap:20px; margin-bottom:20px; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 10px; border: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="pTrendingCheck" style="width: 16px; height: 16px; cursor: pointer;">
                            <span style="font-size: 13px; color: var(--text-primary);">Trending Status</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="pPushNotificationCheck" style="width: 16px; height: 16px; cursor: pointer;">
                            <span style="font-size: 13px; color: var(--success);">Send Notification</span>
                        </div>
                    </div>

                    <hr style="border:0; border-top:1px solid var(--border-color); margin:15px 0;">

                    <div style="display:grid; grid-template-columns: 1fr; gap:15px;">
                        <div>
                            <label class="modal-label" style="color:var(--primary);">App Logo</label>
                            <select id="logoMethod" class="play-input" onchange="toggleUploadMethodInputsStructure('logo', this.value)" style="margin-bottom:10px;">
                                ${encodingMethodsHTML}
                            </select>
                            <div id="logoFileBox">
                                <input type="file" id="logoFile" class="play-input" accept="image/*" style="padding:10px; margin-bottom:5px;">
                            </div>
                            <img id="logoPreviewImg" class="preview-thumbnail" alt="Preview" style="max-width:60px; border-radius:8px; display:none; margin-bottom:10px;">
                            <input type="hidden" id="logoUrlOutput">
                            <p id="logoProcessStatus" style="font-size:11px; color:var(--warning); margin-bottom:10px;"></p>
                        </div>
                        
                        <div>
                            <label class="modal-label" style="color:var(--primary);">Screenshots (Max 5)</label>
                            <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 10px; border: 1px solid var(--border-color);">
                                <input type="file" id="screenshotFileBtn" class="play-input" accept="image/*" style="padding:10px; margin-bottom:5px;">
                                <div class="screenshot-preview-container" id="screenshotPreviewWrapper"></div>
                                <p id="screenshotProcessStatus" style="font-size:11px; color:var(--warning);"></p>
                            </div>
                        </div>
                    </div>

                    <hr style="border:0; border-top:1px solid var(--border-color); margin:15px 0;">

                    <label class="modal-label">Main Download Link</label>
                    <input type="text" id="pMainLink" class="play-input" placeholder="Paste URL here">

                    <label class="modal-label" style="color: var(--warning);">Extra Links (Up to 3)</label>
                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px;" id="extraLinksInputContainer">
                        <div style="display:flex; gap:10px;">
                            <input type="text" class="play-input ex-link-title" placeholder="Title 1" style="margin-bottom:0; flex:1;">
                            <input type="text" class="play-input ex-link-url" placeholder="URL 1" style="margin-bottom:0; flex:2;">
                        </div>
                        <div style="display:flex; gap:10px;">
                            <input type="text" class="play-input ex-link-title" placeholder="Title 2" style="margin-bottom:0; flex:1;">
                            <input type="text" class="play-input ex-link-url" placeholder="URL 2" style="margin-bottom:0; flex:2;">
                        </div>
                        <div style="display:flex; gap:10px;">
                            <input type="text" class="play-input ex-link-title" placeholder="Title 3" style="margin-bottom:0; flex:1;">
                            <input type="text" class="play-input ex-link-url" placeholder="URL 3" style="margin-bottom:0; flex:2;">
                        </div>
                    </div>

                    <label class="modal-label">Search Tags (Comma separated)</label>
                    <div class="tags-container" id="tagsInputContainer" style="padding: 8px;">
                        <input type="text" id="tagInputField" class="tag-input-field" placeholder="Add tags..." style="padding: 5px;">
                    </div>

                    <label class="modal-label">Description</label>
                    <textarea id="pDescription" class="play-input" placeholder="App description & details..." style="min-height:80px; resize:vertical;"></textarea>

                    <button class="play-btn" id="executePublishBtn" onclick="commitPackageToPendingDatabaseNode()">UPLOAD APP</button>
                </div>
            </div>
        `;
        document.body.appendChild(uploadModal);

        initializeTagsInputEngine();

        document.getElementById('logoFile').addEventListener('change', (e) => {
            executeBinaryAssetProcessingStream(e.target.files[0], 'logoMethod', 'logoUrlOutput', 'logoProcessStatus', 'logoPreviewImg');
        });

        document.getElementById('screenshotFileBtn').addEventListener('change', (e) => {
            if (uploadedScreenshotsList.length >= 5) {
                alert("Upload Limit Reached: Maximum of 5 gallery screenshots allocated.");
                e.target.value = '';
                return;
            }
            executeGalleryScreenshotUploadProcessingStream(e.target.files[0]);
        });
    };

    window.toggleAccessTypeInputs = function(value) {
        const coinWrap = document.getElementById('coinPriceWrapper');
        const vidWrap = document.getElementById('videoLinkWrapper');
        if(coinWrap) coinWrap.style.display = (value === 'paid') ? 'block' : 'none';
        if(vidWrap) vidWrap.style.display = (value === 'locked') ? 'block' : 'none';
    };

    window.toggleUploadMethodInputsStructure = function(type, method) {
        const output = document.getElementById(`${type}UrlOutput`);
        const fileBox = document.getElementById(`${type}FileBox`);
        const preview = document.getElementById(`${type}PreviewImg`);

        if (method === 'base64') {
            if(fileBox) fileBox.style.display = 'none';
            if(preview) preview.style.display = 'none';
            output.type = 'text';
            output.className = 'play-input';
            output.placeholder = "Paste Base64 code...";
        } else {
            if(fileBox) fileBox.style.display = 'block';
            output.type = 'hidden';
            output.placeholder = "";
        }
        output.value = '';
    };

    // ==========================================================================
    // 8. CORE BINARY CONVERTER & CLOUD API ENGINE
    // ==========================================================================
    function executeBinaryAssetProcessingStream(file, methodSelectId, outputInputId, statusParaId, previewImgId) {
        if (!file) return;

        const method = document.getElementById(methodSelectId).value;
        const output = document.getElementById(outputInputId);
        const status = document.getElementById(statusParaId);
        const preview = document.getElementById(previewImgId);

        status.innerText = "Processing...";
        status.style.color = "var(--warning)";

        if (method === 'base64') {
            const reader = new FileReader();
            reader.onload = function(e) {
                output.value = e.target.result;
                status.innerText = "Base64 Success!";
                status.style.color = "var(--success)";
                if(preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        } else {
            const formData = new FormData();
            formData.append("image", file);

            fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            })
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    output.value = json.data.url;
                    status.innerText = "Upload Complete!";
                    status.style.color = "var(--success)";
                    if(preview) {
                        preview.src = json.data.url;
                        preview.style.display = 'block';
                    }
                } else {
                    status.innerText = "Upload failed.";
                    status.style.color = "var(--danger)";
                }
            })
            .catch(() => {
                status.innerText = "Network error.";
                status.style.color = "var(--danger)";
            });
        }
    }

    function executeGalleryScreenshotUploadProcessingStream(file) {
        if(!file) return;
        const status = document.getElementById('screenshotProcessStatus');
        const wrapper = document.getElementById('screenshotPreviewWrapper');

        status.innerText = "Uploading...";
        status.style.color = "var(--warning)";

        const formData = new FormData();
        formData.append("image", file);

        fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                const imgUrl = json.data.url;
                uploadedScreenshotsList.push(imgUrl);

                let thumb = document.createElement('img');
                thumb.src = imgUrl;
                thumb.className = 'sc-preview-thumb';
                wrapper.appendChild(thumb);

                status.innerText = `Screenshot ${uploadedScreenshotsList.length}/5 Synced!`;
                status.style.color = "var(--success)";
            } else {
                status.innerText = "Upload failed.";
                status.style.color = "var(--danger)";
            }
            document.getElementById('screenshotFileBtn').value = '';
        })
        .catch(() => {
            status.innerText = "Network error.";
            status.style.color = "var(--danger)";
        });
    }

    // ==========================================================================
    // 9. DATABASE COMMIT PACKAGES CONTROLLER
    // ==========================================================================
    window.commitPackageToPendingDatabaseNode = function() {
        const name = document.getElementById('pName').value.trim();
        const devName = document.getElementById('pDevName').value.trim(); 
        const mainLink = document.getElementById('pMainLink').value.trim();
        const logoData = document.getElementById('logoUrlOutput').value.trim();
        const isTrendingChecked = document.getElementById('pTrendingCheck').checked;
        const isPushNotificationChecked = document.getElementById('pPushNotificationCheck').checked;

        if (!name || !mainLink) {
            alert("App Name and Download Link are required.");
            return;
        }

        let collectedExtraLinks = [];
        const titles = document.querySelectorAll('.ex-link-title');
        const urls = document.querySelectorAll('.ex-link-url');
        
        for(let i = 0; i < urls.length; i++) {
            let tVal = titles[i].value.trim();
            let uVal = urls[i].value.trim();
            if(uVal !== "") {
                collectedExtraLinks.push({
                    title: tVal || `Link ${i + 1}`,
                    url: uVal
                });
            }
        }

        const btn = document.getElementById('executePublishBtn');
        btn.innerText = "UPLOADING...";
        btn.disabled = true;

        const categoryVal = document.getElementById('pCat').value;
        const videoLinkVal = document.getElementById('pVideoLink') ? document.getElementById('pVideoLink').value.trim() : "";

        const transactionalPackagePayload = {
            appName: name,
            developerName: devName || userProfile.name || "Unknown Developer", 
            version: document.getElementById('pVer').value.trim() || "1.0",
            size: document.getElementById('pSize').value.trim() || "0 MB",
            appType: document.getElementById('pType').value,
            category: categoryVal,
            coinPrice: parseInt(document.getElementById('pCoinPrice').value) || 0,
            videoLink: videoLinkVal,
            isTrending: isTrendingChecked,
            sendNotification: isPushNotificationChecked, 
            logoUrl: logoData || "https://via.placeholder.com/150/121212/00e6b8?text=APP",
            screenshots: uploadedScreenshotsList, 
            downloadUrl: mainLink,
            extraLinks: collectedExtraLinks, 
            tags: uploadedTagsList, 
            description: document.getElementById('pDescription').value.trim() || "No description provided.",
            uploaderUid: currentUser.uid,
            uploaderName: userProfile.name,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            autoApproveTime: Date.now() + 60000, 
            status: 'pending',
            downloads: 0,
            views: 0,
            rating: 0,
            totalRatingsCount: 0,
            ratingDistribution: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0
            }
        };

        db.ref('pending_apps').push(transactionalPackagePayload).then(() => {
            alert("App uploaded successfully! It will be live in 1 minute.");
            document.getElementById('dynamicUploadModal').remove();
        }).catch((err) => {
            alert("Error: " + err.message);
            btn.innerText = "UPLOAD APP";
            btn.disabled = false;
        });
    };

    // ==========================================================================
    // 10. IN-APP SYSTEM NOTIFICATIONS
    // ==========================================================================
    window.clearLocalNotifications = function() {
        document.getElementById('notificationInboxDisplay').innerHTML = `<div class="empty-msg" style="text-align:center; color:var(--text-secondary); padding:40px;"><i class="fas fa-trash-alt" style="font-size:30px; margin-bottom:10px;"></i><br>Inbox cleared locally.</div>`;
        document.getElementById('notiAlert').style.display = 'none';
    };

    function listenForLiveSystemNotifications() {
        const inbox = document.getElementById('notificationInboxDisplay');
        const badge = document.getElementById('notiAlert');
        
        db.ref('system_broadcasts').on('value', (snapshot) => {
            if(!inbox) return;
            if(!snapshot.exists()) {
                inbox.innerHTML = `<div class="empty-msg" style="text-align:center; color:var(--text-secondary); padding:40px;"><i class="fas fa-check-circle" style="font-size:30px; margin-bottom:10px; color:var(--success);"></i><br>No new notifications.</div>`;
                return;
            }

            if(badge) badge.style.display = 'block'; 

            let html = '';
            let notices = [];
            snapshot.forEach(child => notices.push({id: child.key, ...child.val()}));
            notices.reverse();

            notices.forEach(note => {
                const alertClass = note.type === 'alert' ? 'system-alert' : '';
                let clickAction = "";
                let cursorStyle = "";
                let linkIndicator = "";
                
                if (note.link && note.link.trim() !== "") {
                    let safeUrl = note.link;
                    if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('details.html')) {
                        safeUrl = 'https://' + safeUrl;
                    }
                    clickAction = `onclick="window.open('${safeUrl}', '_blank')"`;
                    cursorStyle = `cursor: pointer; transition: transform 0.2s; border-color: var(--primary);`;
                    linkIndicator = `<i class="fas fa-external-link-alt" style="color:var(--primary); font-size:12px; float:right;"></i>`;
                }

                html += `
                    <div class="noti-card ${alertClass}" ${clickAction} style="${cursorStyle}">
                        <div class="noti-header">
                            <span class="noti-title"><i class="fas fa-bullhorn"></i> ${note.title} ${linkIndicator}</span>
                            <span class="noti-time">${note.timeString || "Recent"}</span>
                        </div>
                        <p class="noti-msg">${note.message}</p>
                    </div>
                `;
            });
            inbox.innerHTML = html;
        });
    }

    // ==========================================================================
    // 11. AUTOMATED APP DEPLOYMENT & AUTO-NOTIFICATION BOT (CRON SIMULATOR)
    // ==========================================================================
    function runSystemAutoApproveEngine() {
        setInterval(() => {
            db.ref('pending_apps').once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    const currentTimeStamp = Date.now();
                    snapshot.forEach((child) => {
                        let appRecord = child.val();
                        
                        if (currentTimeStamp >= appRecord.autoApproveTime) {
                            appRecord.status = 'approved';
                            appRecord.approvedBy = 'System-Auto-1Min';
                            appRecord.approvedAt = firebase.database.ServerValue.TIMESTAMP;

                            db.ref(`store_apps/${child.key}`).set(appRecord).then(() => {
                                
                                if (appRecord.sendNotification === true) {
                                    const date = new Date();
                                    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + " | " + date.toLocaleDateString();
                                    
                                    db.ref('system_broadcasts').push({
                                        title: "New Application Live!",
                                        message: `🚀 '${appRecord.appName}' (v${appRecord.version}) has been deployed successfully. Tap to explore details.`,
                                        type: "normal",
                                        timeString: timeStr,
                                        sender: "System Bot",
                                        link: `details.html?id=${child.key}`, 
                                        timestamp: firebase.database.ServerValue.TIMESTAMP
                                    });
                                }

                                db.ref(`pending_apps/${child.key}`).remove();
                            });
                        }
                    });
                }
            });
        }, 15000); 
    }

    // ==========================================================================
    // 12. DIRECT AVATAR UPLOAD LISTENER & MY UPLOADS LOGIC
    // ==========================================================================
    window.fetchMyUploadedApps = function() {
        const container = document.getElementById('myUploadsContainer');
        if (!currentUser) {
             if(container) container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);">Please login to view your uploads.</div>`;
             return;
        }

        container.innerHTML = `<div style="text-align:center; padding:30px;"><i class="fas fa-circle-notch fa-spin" style="color:var(--primary); font-size:24px;"></i><p style="margin-top:10px;">Scanning your ecosystem packages...</p></div>`;

        let html = '';
        Promise.all([
            db.ref('store_apps').once('value'),
            db.ref('pending_apps').once('value')
        ]).then(([storeSnap, pendingSnap]) => {
            let userApps = [];

            if (storeSnap.exists()) {
                storeSnap.forEach(child => {
                    let app = child.val();
                    if (app.uploaderUid === currentUser.uid) {
                        userApps.push({ id: child.key, node: 'store_apps', ...app });
                    }
                });
            }

            if (pendingSnap.exists()) {
                pendingSnap.forEach(child => {
                    let app = child.val();
                    if (app.uploaderUid === currentUser.uid) {
                        userApps.push({ id: child.key, node: 'pending_apps', ...app });
                    }
                });
            }

            if (userApps.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);"><i class="fas fa-box-open" style="font-size:35px; margin-bottom:10px; opacity:0.5;"></i><p>You have not published any package blocks yet.</p></div>`;
                return;
            }

            userApps.reverse().forEach(app => {
                const isLive = app.node === 'store_apps';
                const statusBadge = isLive ? `<span style="color:var(--success); font-size:10px; font-weight:bold; background:rgba(46,213,115,0.1); padding:2px 6px; border-radius:4px; border:1px solid rgba(46,213,115,0.2);">Live Store</span>` : `<span style="color:var(--warning); font-size:10px; font-weight:bold; background:rgba(255,165,0,0.1); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,165,0,0.2);">Pending Review</span>`;
                
                html += `
                    <div style="display:flex; align-items:center; gap:12px; background:rgba(0,0,0,0.2); margin-bottom:12px; padding:12px; border-radius:12px; border:1px solid var(--border-glass);">
                        <img src="${app.logoUrl}" style="width:48px; height:48px; border-radius:10px; object-fit:cover; border:1px solid var(--border-glass);">
                        <div style="flex:1; overflow:hidden;">
                            <h4 style="font-size:14px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${app.appName}</h4>
                            <p style="font-size:12px; color:var(--text-dim); display:flex; align-items:center; gap:8px;">v${app.version} • ${statusBadge}</p>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button style="background:rgba(0,168,255,0.1); color:var(--info); border:none; width:35px; height:35px; border-radius:8px; cursor:pointer;" onclick="window.openUserAppEdit('${app.id}', '${app.node}')"><i class="fas fa-edit"></i></button>
                            <button style="background:rgba(255,71,87,0.1); color:var(--danger); border:none; width:35px; height:35px; border-radius:8px; cursor:pointer;" onclick="window.deleteUserApp('${app.id}', '${app.node}')"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        });
    };

    window.openUserAppEdit = function(appId, node) {
        db.ref(`${node}/${appId}`).once('value').then(snap => {
            if (!snap.exists()) return;
            const app = snap.val();
            
            document.getElementById('euAppId').value = appId;
            document.getElementById('euAppStatus').value = node;
            document.getElementById('euName').value = app.appName || "";
            document.getElementById('euVer').value = app.version || "";
            document.getElementById('euSize').value = app.size || "";
            document.getElementById('euMainLink').value = app.downloadUrl || "";
            document.getElementById('euDescription').value = app.description || "";
            
            document.getElementById('userAppEditModal').classList.add('active');
        });
    };

    window.submitUserAppUpdate = function() {
        const appId = document.getElementById('euAppId').value;
        const node = document.getElementById('euAppStatus').value;
        const name = document.getElementById('euName').value.trim();
        const ver = document.getElementById('euVer').value.trim();
        const size = document.getElementById('euSize').value.trim();
        const link = document.getElementById('euMainLink').value.trim();
        const desc = document.getElementById('euDescription').value.trim();

        if (!name || !link) {
            alert("App Name and Download Link are required parameters.");
            return;
        }

        let updates = {
            appName: name,
            version: ver || "1.0",
            size: size || "0 MB",
            downloadUrl: link,
            description: desc || "No description provided."
        };

        db.ref(`${node}/${appId}`).update(updates).then(() => {
            alert("Application Package Synchronized Successfully!");
            document.getElementById('userAppEditModal').classList.remove('active');
            window.fetchMyUploadedApps();
            if (typeof window.loadStoreFeed === 'function') window.loadStoreFeed();
        });
    };

    window.deleteUserApp = function(appId, node) {
        if (confirm("DANGER: Are you sure you want to permanently wipe this application block registry from the master server?")) {
            db.ref(`${node}/${appId}`).remove().then(() => {
                alert("Wipe lifecycle transaction completed.");
                window.fetchMyUploadedApps();
                if (typeof window.loadStoreFeed === 'function') window.loadStoreFeed();
            });
        }
    };

});
