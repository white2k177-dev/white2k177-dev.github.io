/* ==========================================================================
   MVX STORE V4.0 - ADMIN PANEL LOGIC ENGINE
   ==========================================================================
   - Pending Applications Review & Approval System
   - User Reports Moderation
   - Action Logging for Master Owner
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // Safety check for Firebase
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK missing. Admin Engine halted.");
        return;
    }

    const db = firebase.database();
    const auth = firebase.auth();
    let currentAdmin = null;

    // Verify Admin Identity
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentAdmin = user;
        }
    });

    // ==========================================================================
    // 1. INITIALIZE ADMIN ENGINE (Called from admin.html)
    // ==========================================================================
    window.initAdminEngine = function() {
        console.log("Admin Logic Engine Started...");
        loadDashboardStats();
        loadPendingApps();
        loadUserReports();
    };

    // ==========================================================================
    // 2. ACTION LOGGER (Records admin actions for Owner to see)
    // ==========================================================================
    function logAdminAction(actionType, targetId, details) {
        if(!currentAdmin) return;
        const logData = {
            adminEmail: currentAdmin.email,
            adminUid: currentAdmin.uid,
            action: actionType,
            target: targetId,
            details: details,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        db.ref('admin_logs').push(logData);
        
        // Update Action Count in Dashboard
        const actionStat = document.getElementById('statActionTaken');
        if(actionStat) {
            let currentVal = parseInt(actionStat.innerText) || 0;
            actionStat.innerText = currentVal + 1;
        }
    }

    // ==========================================================================
    // 3. DASHBOARD STATS LISTENER
    // ==========================================================================
    function loadDashboardStats() {
        // Live count of pending apps
        db.ref('pending_apps').on('value', (snap) => {
            const count = snap.numChildren();
            document.getElementById('statPendingApps').innerText = count;
            document.getElementById('statPending').innerText = count;
            const badge = document.getElementById('badgePending');
            if(badge) {
                badge.innerText = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        });

        // Live count of unresolved reports
        db.ref('reports').orderByChild('status').equalTo('unresolved').on('value', (snap) => {
            const count = snap.numChildren();
            document.getElementById('statReports').innerText = count;
            const badge = document.getElementById('badgeReports');
            if(badge) {
                badge.innerText = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        });
    }

    // ==========================================================================
    // 4. PENDING APPS REVIEW SYSTEM
    // ==========================================================================
    let pendingAppsData = {}; // Cache for modal

    function loadPendingApps() {
        const tableBody = document.getElementById('pendingTableBody');
        
        db.ref('pending_apps').on('value', (snapshot) => {
            if (!snapshot.exists()) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align:center; padding: 40px; color:#94a3b8;">
                            <i class="fas fa-check-circle" style="font-size:30px; color:#00ff88; margin-bottom:10px; opacity:0.5;"></i>
                            <br>All caught up! No pending applications.
                        </td>
                    </tr>`;
                return;
            }

            let html = '';
            pendingAppsData = {}; // Clear cache

            snapshot.forEach((child) => {
                const app = child.val();
                const appId = child.key;
                pendingAppsData[appId] = app;

                const timeStr = typeof formatTimeDynamic === 'function' ? formatTimeDynamic(app.timestamp) : "Recently";
                
                html += `
                    <tr>
                        <td>
                            <div class="td-app-info">
                                <img src="${app.logoUrl}" class="td-icon" style="object-fit:cover;" onerror="this.src='https://via.placeholder.com/50/020617/00e6b8?text=APP'">
                                <div class="td-text">
                                    <h4>${app.appName}</h4>
                                    <p>Version: ${app.version} • Size: ${app.size}</p>
                                </div>
                            </div>
                        </td>
                        <td><span style="font-family:'Orbitron', sans-serif; font-size:11px; color:#64748b;">${app.uploaderUid.substring(0,10)}...</span></td>
                        <td>${timeStr}</td>
                        <td><span class="badge badge-pending">Review Needed</span></td>
                        <td>
                            <div class="td-actions" style="justify-content: flex-end;">
                                <button class="btn-table btn-view" title="Review App" onclick="openAppReview('${appId}')"><i class="fas fa-eye"></i></button>
                                <button class="btn-table btn-accept" title="Direct Approve" onclick="approveApp('${appId}')"><i class="fas fa-check"></i></button>
                                <button class="btn-table btn-decline" title="Reject App" onclick="rejectApp('${appId}')"><i class="fas fa-times"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tableBody.innerHTML = html;
        });
    }

    // Modal Details Populate
    window.openAppReview = function(appId) {
        const app = pendingAppsData[appId];
        if(!app) return;

        // Set global modal function if exists
        if(typeof window.openReviewModal === 'function') window.openReviewModal();

        // Populate Modal Fields (Targeting elements in admin.html)
        const modal = document.getElementById('appReviewModal');
        if(!modal) return;

        const detailsBox = modal.querySelectorAll('.detail-value');
        if(detailsBox.length >= 4) {
            detailsBox[0].innerText = app.appName;
            detailsBox[1].innerText = app.uploaderUid;
            detailsBox[2].innerHTML = `<a href="${app.downloadUrl}" target="_blank" style="color:#00e6b8; text-decoration:underline;">Test Download Link</a>`;
            detailsBox[3].innerText = new Date(app.timestamp).toLocaleString();
        }

        const descBox = modal.querySelectorAll('.detail-box .detail-value')[4];
        if(descBox) descBox.innerText = app.description;

        // Update Modal Buttons
        const footerBtns = modal.querySelectorAll('.modal-footer button');
        if(footerBtns.length >= 3) {
            footerBtns[1].onclick = () => { rejectApp(appId); closeModal('appReviewModal'); };
            footerBtns[2].onclick = () => { approveApp(appId); closeModal('appReviewModal'); };
        }
    };

    // APPROVE LOGIC
    window.approveApp = function(appId) {
        showConfirmModal("Publish this application to the main store?", () => {
            if(typeof toggleGlobalLoader === 'function') toggleGlobalLoader(true, "PUBLISHING APP...");
            
            const appRef = db.ref(`pending_apps/${appId}`);
            appRef.once('value').then(snap => {
                if(snap.exists()) {
                    let appData = snap.val();
                    appData.status = 'approved';
                    appData.approvedAt = firebase.database.ServerValue.TIMESTAMP;
                    appData.approvedBy = currentAdmin.email;

                    // Move to store_apps
                    db.ref(`store_apps/${appId}`).set(appData).then(() => {
                        // Delete from pending
                        appRef.remove().then(() => {
                            logAdminAction('APPROVED_APP', appId, `Approved ${appData.appName}`);
                            if(typeof toggleGlobalLoader === 'function') toggleGlobalLoader(false);
                            if(typeof showGlobalToast === 'function') showGlobalToast('App Published Successfully!', 'success');
                            
                            // NOtification logic can be added here
                        });
                    });
                }
            });
        });
    };

    // REJECT LOGIC
    window.rejectApp = function(appId) {
        showConfirmModal("Reject and delete this application request?", () => {
            if(typeof toggleGlobalLoader === 'function') toggleGlobalLoader(true, "REJECTING APP...");
            
            db.ref(`pending_apps/${appId}`).once('value').then(snap => {
                if(snap.exists()) {
                    const appName = snap.val().appName;
                    db.ref(`pending_apps/${appId}`).remove().then(() => {
                        logAdminAction('REJECTED_APP', appId, `Rejected ${appName}`);
                        if(typeof toggleGlobalLoader === 'function') toggleGlobalLoader(false);
                        if(typeof showGlobalToast === 'function') showGlobalToast('Application Request Rejected.', 'error');
                    });
                }
            });
        });
    };

    // ==========================================================================
    // 5. USER REPORTS VERIFICATION SYSTEM
    // ==========================================================================
    function loadUserReports() {
        const tableBody = document.getElementById('reportsTableBody');
        
        db.ref('reports').on('value', (snapshot) => {
            if (!snapshot.exists()) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align:center; padding: 40px; color:#94a3b8;">
                            <i class="fas fa-shield-check" style="font-size:30px; color:#00ff88; margin-bottom:10px; opacity:0.5;"></i>
                            <br>No active reports. Community is safe.
                        </td>
                    </tr>`;
                return;
            }

            let html = '';
            snapshot.forEach((child) => {
                const report = child.val();
                const reportId = child.key;

                if(report.status === 'unresolved') {
                    html += `
                        <tr>
                            <td>
                                <strong style="color:#fff;">Target App ID:</strong><br>
                                <span style="font-family:'Orbitron', sans-serif; font-size:11px; color:#00e6b8;">${report.appId}</span>
                            </td>
                            <td>${report.reporterEmail}</td>
                            <td style="color:#ff003c; font-weight:bold;">${report.reason}</td>
                            <td>
                                <div class="td-actions" style="justify-content: flex-end;">
                                    <button class="btn-table" style="background:rgba(255,215,0,0.1); color:#ffd700; border:1px solid rgba(255,215,0,0.3);" title="Forward to Owner" onclick="forwardReport('${reportId}')"><i class="fas fa-share"></i></button>
                                    <button class="btn-table btn-decline" title="Dismiss Report" onclick="dismissReport('${reportId}')"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            });

            if(html === '') {
                html = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">All reports are handled.</td></tr>`;
            }
            tableBody.innerHTML = html;
        });
    }

    // Forward to Owner Action
    window.forwardReport = function(reportId) {
        showConfirmModal("Forward this report to the Master Owner for strict action?", () => {
            db.ref(`reports/${reportId}/status`).set('forwarded').then(() => {
                logAdminAction('FORWARDED_REPORT', reportId, 'Forwarded severe report to Owner');
                if(typeof showGlobalToast === 'function') showGlobalToast('Report Escalated to Owner.', 'success');
            });
        });
    };

    // Dismiss False Report Action
    window.dismissReport = function(reportId) {
        showConfirmModal("Dismiss this report as false alarm?", () => {
            db.ref(`reports/${reportId}`).remove().then(() => {
                logAdminAction('DISMISSED_REPORT', reportId, 'Dismissed a false report');
                if(typeof showGlobalToast === 'function') showGlobalToast('Report Dismissed.', 'success');
            });
        });
    };

});
