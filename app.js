import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBkpZiuKnc1QSi7TTSCOxkCsQhTcB25EBw",
    authDomain: "noweerud.firebaseapp.com",
    projectId: "noweerud",
    storageBucket: "noweerud.firebasestorage.app",
    messagingSenderId: "695716643583",
    appId: "1:695716643583:web:65de54c94be7db99b482ca"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUserData = null;
let allUsers = [];
let allCategories = [];
let localFixedDuties = [];
let localOccasionalAsystas = [];
let localAnnouncements = [];

// Obsługa menu mobilnego
window.toggleMobileSidebar = function() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-overlay');
    if (sidebar && backdrop) {
        sidebar.classList.toggle('mobile-open');
        backdrop.classList.toggle('mobile-open');
    }
};

// Autentykacja
const authForm = document.getElementById('auth-form');
const toggleAuthBtn = document.getElementById('toggle-auth-mode');
let isLoginMode = true;

if (toggleAuthBtn) {
    toggleAuthBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        document.getElementById('name-field').classList.toggle('hidden', isLoginMode);
        document.getElementById('role-field').classList.toggle('hidden', isLoginMode);
        toggleAuthBtn.innerText = isLoginMode ? 'Nowy ministrant? Zarejestruj profil' : 'Masz już konto? Zaloguj się';
        authForm.querySelector('button[type="submit"]').innerText = isLoginMode ? 'Wejdź do Zakrystii' : 'Utwórz i nadaj rolę';
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const name = document.getElementById('auth-name').value.trim();
                const chosenRole = document.getElementById('auth-role').value;
                if(!name) return alert("Podaj Imię i Nazwisko!");
                
                const res = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", res.user.uid), { name: name, email: email, role: chosenRole, points: 0 });
                alert("Konto utworzone.");
                isLoginMode = true;
                document.getElementById('name-field').classList.add('hidden');
                document.getElementById('role-field').classList.add('hidden');
            }
        } catch (err) { alert("Błąd: " + err.message); }
    });
}

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        currentUserData = userDoc.data() || { name: "Ministrant", role: "ministrant", points: 0 };
        launchApp();
    } else { shutdownApp(); }
});

function launchApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-sidebar').classList.remove('hidden');
    document.getElementById('app-content').classList.remove('hidden');
    document.getElementById('mobile-navbar').classList.remove('hidden');

    document.getElementById('sidebar-user-name').innerText = currentUserData.name;
    document.getElementById('user-role-badge').innerText = currentUserData.role === 'admin' ? "Administrator" : "Status: Ministrant";

    const adminElements = document.querySelectorAll('.admin-only-element, .admin-only-nav');
    adminElements.forEach(el => {
        if (currentUserData.role === 'admin') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    startSync();
    switchTab('home');
}

function shutdownApp() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-sidebar').classList.add('hidden');
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('mobile-navbar').classList.add('hidden');
}

function startSync() {
    onSnapshot(collection(db, "users"), (snap) => {
        allUsers = []; snap.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));
        renderRankingAndPodium();
        populateAdminSelectors();
        const me = allUsers.find(u => u.id === currentUser.uid);
        if(me) document.getElementById('user-points-total').innerText = me.points || 0;
    });

    onSnapshot(collection(db, "categories"), (snap) => {
        allCategories = []; snap.forEach(doc => allCategories.push({ id: doc.id, ...doc.data() }));
        renderCategoriesTab();
    });

    onSnapshot(query(collection(db, "announcements"), orderBy("timestamp", "desc")), (snap) => {
        localAnnouncements = [];
        const adminTbody = document.getElementById('admin-announcements-list');
        const globalView = document.getElementById('global-announcements-view');
        if(adminTbody) adminTbody.innerHTML = '';
        if(globalView) globalView.innerHTML = '';

        snap.forEach(doc => {
            const d = doc.data(); const id = doc.id;
            localAnnouncements.push({ id, ...d });
            if(adminTbody) {
                adminTbody.innerHTML += `<tr><td><b>${d.title}</b><br><small>${d.date}</small></td><td>${d.content}</td><td><button onclick="deleteAnnouncement('${id}')" class="btn-delete-cat" style="margin:0; width:auto; padding:4px 8px;">Usuń</button></td></tr>`;
            }
            if(globalView) {
                globalView.innerHTML += `<div class="announcement-item"><div class="announcement-header"><h4>${d.title}</h4><span class="announcement-date">${d.date}</span></div><p class="announcement-body">${d.content}</p></div>`;
            }
        });
        if(localAnnouncements.length === 0 && globalView) globalView.innerHTML = '<p class="sub-label">Brak ogłoszeń.</p>';
    });

    onSnapshot(query(collection(db, "points_history"), orderBy("date", "desc")), (snap) => {
        const tbody = document.getElementById('user-points-history');
        if(!tbody) return; tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            if(d.userId === currentUser.uid) {
                tbody.innerHTML += `<tr><td>${d.date}</td><td>${d.category}</td><td class="text-right" style="color:var(--maroon-base); font-weight:700;">${d.points >= 0 ? '+':''}${d.points}</td></tr>`;
            }
        });
    });

    onSnapshot(collection(db, "fixed_duties"), (snap) => {
        localFixedDuties = [];
        const tbody = document.getElementById('admin-fixed-list');
        if(tbody) tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data(); const id = doc.id;
            localFixedDuties.push({ id, ...d });
            if(tbody) {
                let infoLabel = d.day === "Niedziela" ? `Godz. ${d.hour || '7:30'}` : (d.type || 'ministrant');
                tbody.innerHTML += `<tr><td><b>${d.day}</b> <small>(${infoLabel})</small></td><td>${d.user}</td><td><button onclick="deleteFixedDuty('${id}')" class="btn-delete-cat" style="margin:0; width:auto; padding:4px 8px;">Usuń</button></td></tr>`;
            }
        });
        renderFixedScheduleGlobalView();
    });

    onSnapshot(collection(db, "asysty_okolicznosciowe"), (snap) => {
        localOccasionalAsystas = [];
        snap.forEach(doc => localOccasionalAsystas.push({ id: doc.id, ...doc.data() }));
        renderOccasionalAsystasCards();
    });
}

function populateAdminSelectors() {
    const fsSel = document.getElementById('fs-user');
    if(fsSel) {
        fsSel.innerHTML = '';
        allUsers.forEach(u => fsSel.innerHTML += `<option value="${u.name}">${u.name}</option>`);
    }

    const att = document.getElementById('attendance-list');
    if(att) {
        att.innerHTML = '';
        allUsers.forEach(u => att.innerHTML += `<label><input type="checkbox" value="${u.id}"> ${u.name}</label>`);
    }

    const fsDaySel = document.getElementById('fs-day');
    if (fsDaySel) {
        fsDaySel.innerHTML = `
            <option value="Niedziela">Niedziela</option>
            <option value="Poniedziałek">Poniedziałek</option>
            <option value="Wtorek">Wtorek</option>
            <option value="Środa">Środa</option>
            <option value="Czwartek">Czwartek</option>
            <option value="Piątek">Piątek</option>
            <option value="Sobota">Sobota</option>
        `;
        
        // Funkcja ukrywająca/pokazująca odpowiednie selektory w zależności od wybranego dnia
        fsDaySel.onchange = function() {
            const typeSel = document.getElementById('fs-type');
            const hourSel = document.getElementById('fs-hour');
            if(this.value === "Niedziela") {
                if(typeSel) typeSel.classList.add('hidden');
                if(hourSel) hourSel.classList.remove('hidden');
            } else {
                if(typeSel) typeSel.classList.remove('hidden');
                if(hourSel) hourSel.classList.add('hidden');
            }
        };
    }

    // Selektor stopnia dla dni powszednich
    let fsTypeSel = document.getElementById('fs-type');
    if (!fsTypeSel && fsDaySel) {
        fsTypeSel = document.createElement('select');
        fsTypeSel.id = 'fs-type';
        fsTypeSel.style.marginRight = '8px';
        fsTypeSel.style.padding = '8px';
        fsTypeSel.style.borderRadius = '6px';
        fsTypeSel.style.border = '1px solid var(--border-soft)';
        fsTypeSel.innerHTML = `
            <option value="ministrant">Ministrant</option>
            <option value="lektor">Lektor</option>
            <option value="ceremoniarz">Ceremoniarz</option>
        `;
        fsDaySel.parentNode.insertBefore(fsTypeSel, fsDaySel.nextSibling);
    }

    // Selektor godzin WYŁĄCZNIE dla Niedzieli
    let fsHourSel = document.getElementById('fs-hour');
    if (!fsHourSel && fsDaySel) {
        fsHourSel = document.createElement('select');
        fsHourSel.id = 'fs-hour';
        fsHourSel.style.marginRight = '8px';
        fsHourSel.style.padding = '8px';
        fsHourSel.style.borderRadius = '6px';
        fsHourSel.style.border = '1px solid var(--border-soft)';
        fsHourSel.innerHTML = `
            <option value="7:30">Godzina 7:30</option>
            <option value="9:30">Godzina 9:30</option>
            <option value="11:00">Godzina 11:00</option>
        `;
        fsDaySel.parentNode.insertBefore(fsHourSel, fsDaySel.nextSibling);
    }

    // Wywołanie startowe dopasowania pól
    if(fsDaySel) fsDaySel.onchange();

    const container = document.getElementById('dynamic-functions-container');
    if(container && container.children.length === 0) {
        addNewFunctionRow("Turyferariusz");
        addNewFunctionRow("Nawikulariusz");
        addNewFunctionRow("Akolita 1");
        addNewFunctionRow("Akolita 2");
        addNewFunctionRow("Krucyferariusz");
        addNewFunctionRow("Ceremoniarz");
    }
}

window.addNewFunctionRow = function(functionName = "") {
    const container = document.getElementById('dynamic-functions-container');
    if(!container) return;

    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const row = document.createElement('div');
    row.className = 'func-setup-row';
    row.id = rowId;

    let userOptions = '<option value="-">Brak</option>';
    allUsers.forEach(u => {
        userOptions += `<option value="${u.name}">${u.name}</option>`;
    });

    row.innerHTML = `
        <input type="text" class="func-name-input" placeholder="np. Miterariusz, Lekcja I" value="${functionName}">
        <select class="select-asysta-user">
            ${userOptions}
        </select>
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="btn-delete-cat" style="width: auto; margin: 0; padding: 6px 12px;">X</button>
    `;
    container.appendChild(row);
};

window.addWholeOccasionalAsysta = async function() {
    const title = document.getElementById('os-group-title').value.trim();
    const date = document.getElementById('os-group-date').value;
    const time = document.getElementById('os-group-time').value;

    if(!title || !date || !time) {
        return alert("Wprowadź tytuł, datę oraz godzinę uroczystości!");
    }

    const rows = document.querySelectorAll('#dynamic-functions-container .func-setup-row');
    const functionsList = [];

    rows.forEach(row => {
        const fName = row.querySelector('.func-name-input').value.trim();
        const fUser = row.querySelector('.select-asysta-user').value;

        if(fName && fUser !== "-") {
            functionsList.push({
                functionName: fName,
                assignedUser: fUser
            });
        }
    });

    const payload = {
        title: title,
        date: date,
        time: time,
        functions: functionsList
    };

    try {
        await addDoc(collection(db, "asysty_okolicznosciowe"), payload);
        alert("Asysta została zapisana!");
        
        document.getElementById('os-group-title').value = '';
        document.getElementById('os-group-date').value = '';
        document.getElementById('os-group-time').value = '';
        document.getElementById('dynamic-functions-container').innerHTML = '';
        
        addNewFunctionRow("Turyferariusz");
        addNewFunctionRow("Nawikulariusz");
        addNewFunctionRow("Akolita 1");
        addNewFunctionRow("Akolita 2");
    } catch(err) {
        alert("Błąd zapisu: " + err.message);
    }
};

function renderOccasionalAsystasCards() {
    const container = document.getElementById('global-occasional-cards-container');
    if(!container) return;
    container.innerHTML = '';

    localOccasionalAsystas.forEach(asysta => {
        const isAdmin = currentUserData && currentUserData.role === 'admin';
        const deleteBtn = isAdmin ? `<button onclick="deleteWholeAsysta('${asysta.id}')" class="btn-delete-cat" style="width:auto; margin-top:10px;">Usuń asystę</button>` : '';
        const reportBtn = isAdmin ? `<button onclick="printAsystaReport('${asysta.id}')" class="btn-maroon-solid" style="width:auto; background:#3D050B; padding:6px 12px; font-size:12px; margin-top:10px; margin-right:10px;">Drukuj do gabloty (PDF)</button>` : '';

        let tableRowsHtml = '';
        if(asysta.functions && asysta.functions.length > 0) {
            asysta.functions.forEach(f => {
                tableRowsHtml += `<tr><td><b>${f.functionName}</b></td><td>${f.assignedUser}</td></tr>`;
            });
        }

        container.innerHTML += `
            <div class="info-card" style="border-top: 4px solid var(--maroon-base);">
                <div>
                    <h2>${asysta.title}</h2>
                    <p class="sub-label" style="margin-bottom:15px;">Kiedy: ${asysta.date} r. o godz. ${asysta.time}</p>
                </div>
                <table class="maroon-table" style="box-shadow:none; border:1px solid var(--border-soft);">
                    <thead>
                        <tr style="background:#FDFBF7;"><th style="padding:8px 12px;">Funkcja</th><th style="padding:8px 12px;">Ministrant</th></tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
                <div>
                    ${reportBtn}
                    ${deleteBtn}
                </div>
            </div>
        `;
    });
}

window.deleteWholeAsysta = async function(id) {
    if(confirm("Usunąć tę asystę?")) {
        await deleteDoc(doc(db, "asysty_okolicznosciowe", id));
    }
};

window.printAsystaReport = function(id) {
    const asysta = localOccasionalAsystas.find(a => a.id === id);
    if(!asysta) return;

    let tableBodyHtml = '';
    if(asysta.functions && asysta.functions.length > 0) {
        asysta.functions.forEach(f => {
            tableBodyHtml += `<tr><td style="padding:14px; border-bottom:1px solid #E2E8F0; font-size:16px;"><b>${f.functionName}</b></td><td style="padding:14px; border-bottom:1px solid #E2E8F0; font-size:16px; font-weight:bold; color:#5A0F1A;">${f.assignedUser}</td></tr>`;
        });
    }

    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>Rozpiska - ${asysta.title}</title>
            <style>
                body { font-family: 'Arial', sans-serif; color: #2F050A; padding: 40px; text-align: center; background: #ffffff; }
                .border-box { border: 5px double #5A0F1A; padding: 40px; max-width: 750px; margin: 0 auto; }
                .header-title { font-size: 30px; font-weight: 900; color: #5A0F1A; text-transform: uppercase; letter-spacing: 1px; }
                .sub { font-size: 20px; text-transform: uppercase; color: #2F050A; margin-top: 12px; font-weight: bold; border-bottom: 3px solid #5A0F1A; padding-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; margin-top: 30px; text-align: left; }
                th { background: #5A0F1A; color: white; padding: 12px; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; }
                .footer-stamp { text-align: center; font-size: 13px; color: #5A0F1A; font-weight: bold; margin-top: 50px; letter-spacing: 2px; }
            </style>
        </head>
        <body>
            <div class="border-box">
                <div class="header-title">Liturgiczna Służba Ołtarza</div>
                <div class="sub">${asysta.title}</div>
                <table>
                    <thead>
                        <tr><th>Funkcja Liturgiczna</th><th>Przypisany Ministrant</th></tr>
                    </thead>
                    <tbody>
                        ${tableBodyHtml}
                    </tbody>
                </table>
                <div class="footer-stamp">KRÓLUJ NAM CHRYSTE! — PARAFIA RUDA</div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
    win.print();
};

function renderCategoriesTab() {
    const select = document.getElementById('event-category-select');
    const container = document.getElementById('categories-container-list');
    if(select) select.innerHTML = '';
    if(container) container.innerHTML = '';

    allCategories.forEach(c => {
        if(select) select.innerHTML += `<option value="${c.id}">${c.name} (${c.points > 0 ? '+':''}${c.points} pkt)</option>`;
        if(container) {
            const deleteBtnHtml = currentUserData && currentUserData.role === 'admin' ? `<button onclick="deleteCategory('${c.id}')" class="btn-delete-cat">Usuń</button>` : '';
            container.innerHTML += `<div class="category-admin-card"><h4>${c.name}</h4><div class="pts-badge">${c.points > 0 ? '+':''}${c.points} pkt</div>${deleteBtnHtml}</div>`;
        }
    });
}

window.addAnnouncement = async function() {
    const title = document.getElementById('ann-title').value.trim();
    const content = document.getElementById('ann-content').value.trim();
    if(!title || !content) return alert("Wypełnij pola!");
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth()+1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    await addDoc(collection(db, "announcements"), { title, content, date: formattedDate, timestamp: now.getTime() });
    document.getElementById('ann-title').value = ''; document.getElementById('ann-content').value = '';
};
window.deleteAnnouncement = async function(id) { if(confirm("Usunąć?")) await deleteDoc(doc(db, "announcements", id)); };

window.addCategory = async function() {
    const name = document.getElementById('new-cat-name').value.trim();
    const points = document.getElementById('new-cat-value').value;
    if(!name || !points) return alert("Uzupełnij pola!");
    await addDoc(collection(db, "categories"), { name, points: Number(points) });
    document.getElementById('new-cat-name').value = ''; document.getElementById('new-cat-value').value = '';
};
window.deleteCategory = async function(id) { if(confirm("Usunąć regułę?")) await deleteDoc(doc(db, "categories", id)); };

window.saveAttendance = async function() {
    const date = document.getElementById('event-date').value;
    const catId = document.getElementById('event-category-select').value;
    const checked = document.querySelectorAll('#attendance-list input:checked');
    if(!date || !catId || checked.length === 0) return alert("Zaznacz wymagane pola!");
    const cat = allCategories.find(c => c.id === catId);

    for(let b of checked) {
        const uId = b.value; const userRef = doc(db, "users", uId); const userDoc = await getDoc(userRef);
        const currentPoints = userDoc.data().points || 0;
        await addDoc(collection(db, "points_history"), { userId: uId, date, category: cat.name, points: Number(cat.points) });
        await setDoc(userRef, { points: currentPoints + Number(cat.points) }, { merge: true });
    }
    alert("Punkty zaktualizowane."); checked.forEach(c => c.checked = false);
};

window.addFixedDuty = async function() {
    const user = document.getElementById('fs-user').value; 
    const day = document.getElementById('fs-day').value;
    
    let payload = { user, day };
    if(day === "Niedziela") {
        payload.hour = document.getElementById('fs-hour').value;
    } else {
        payload.type = document.getElementById('fs-type') ? document.getElementById('fs-type').value : 'ministrant';
    }

    await addDoc(collection(db, "fixed_duties"), payload);
    alert("Dodano do grafiku stałego!");
};
window.deleteFixedDuty = async function(id) { await deleteDoc(doc(db, "fixed_duties", id)); };

// JEDEN BLOK NIEDZIELI Z PODZIAŁEM NA GODZINY W JEDNYM WIDOKU
function renderFixedScheduleGlobalView() {
    const view = document.getElementById('global-fixed-schedule-view');
    if(!view) return; view.innerHTML = '';
    
    // 1. Renderowanie JEDNEJ wspólnej Niedzieli rozbitej w środku na godziny
    const sunDuties = localFixedDuties.filter(d => d.day === "Niedziela");
    const sun730 = sunDuties.filter(d => d.hour === '7:30').map(m => m.user).join(", ") || '<i>Brak</i>';
    const sun930 = sunDuties.filter(d => d.hour === '9:30').map(m => m.user).join(", ") || '<i>Brak</i>';
    const sun1100 = sunDuties.filter(d => d.hour === '11:00').map(m => m.user).join(", ") || '<i>Brak</i>';

    view.innerHTML += `
        <div class="day-card-item" style="margin-bottom:15px; padding:15px; border-left:5px solid #8B1E2B; background:#fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <h4 style="margin:0 0 10px 0; font-size:18px; color:#5A0F1A; font-weight:bold; text-transform:uppercase;">Niedziela</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                <div style="background:#FAF8F5; padding:8px; border-radius:4px;"><b>Godz. 07:30:</b><br>${sun730}</div>
                <div style="background:#FAF8F5; padding:8px; border-radius:4px;"><b>Godz. 09:30:</b><br>${sun930}</div>
                <div style="background:#FAF8F5; padding:8px; border-radius:4px;"><b>Godz. 11:00:</b><br>${sun1100}</div>
            </div>
        </div>
    `;

    // 2. Pozostałe dni powszednie z podziałem na stopnie (Lektorzy i Ceremoniarze razem)
    const weekDays = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
    weekDays.forEach(day => {
        const dutiesOnDay = localFixedDuties.filter(d => d.day === day);
        const mins = dutiesOnDay.filter(d => d.type === 'ministrant' || !d.type).map(m => m.user).join(", ");
        const leks = dutiesOnDay.filter(d => d.type === 'lektor' || d.type === 'ceremoniarz').map(m => m.user).join(", ");
        
        view.innerHTML += `
            <div class="day-card-item" style="margin-bottom:15px; padding:12px; border-left:4px solid #5A0F1A; background:#fff;">
                <h5 style="margin:0 0 8px 0; font-size:16px; color:#5A0F1A; font-weight:bold;">${day}</h5>
                <p style="margin:2px 0; font-size:14px;"><b>Ministranci:</b> ${mins || '<i>Brak</i>'}</p>
                <p style="margin:2px 0; font-size:14px;"><b>Lektorzy / Ceremoniarze:</b> ${leks || '<i>Brak</i>'}</p>
            </div>
        `;
    });
}

function renderRankingAndPodium() {
    const sorted = [...allUsers].sort((a,b) => b.points - a.points);
    const podium = document.getElementById('podium-container');
    const tbody = document.getElementById('ranking-table-body');

    if(podium) {
        podium.innerHTML = ''; const top3 = sorted.slice(0, 3); let order = [];
        if(top3[1]) order.push({ u: top3[1], place: "2 Miejsce", cls: "" });
        if(top3[0]) order.push({ u: top3[0], place: "1 Miejsce", cls: "first-place" });
        if(top3[2]) order.push({ u: top3[2], place: "3 Miejsce", cls: "" });
        order.forEach(p => {
            podium.innerHTML += `<div class="podium-slot ${p.cls}"><div class="podium-num">${p.place}</div><div class="podium-title">${p.u.name}</div><div class="podium-pts">${p.u.points || 0} pkt</div></div>`;
        });
    }
    if(tbody) {
        tbody.innerHTML = '';
        sorted.forEach((u, i) => {
            let badgeClass = i === 0 ? 'badge-gold' : i === 1 ? 'badge-silver' : i === 2 ? 'badge-bronze' : 'badge-regular';
            tbody.innerHTML += `<tr><td><span class="rank-badge-circle ${badgeClass}">${i+1}</span></td><td><b>${u.name}</b></td><td class="text-right" style="font-weight:700; color:var(--maroon-base);">${u.points || 0} pkt</td></tr>`;
        });
    }
}

// WYDRUK PDF Z JEDNĄ WSPÓLNĄ NIEDZIELĄ ROZBITĄ NA TRZY GODZINY ORAZ REZSTĄ DNI
window.generateFixedReportPDF = function() {
    if(currentUserData.role !== 'admin') return;
    const win = window.open('', '_blank'); 
    
    // Budowa wiersza dla Niedzieli
    const sunDuties = localFixedDuties.filter(d => d.day === "Niedziela");
    const sun730 = sunDuties.filter(d => d.hour === '7:30').map(m => m.user).join(", ") || '<i>Brak</i>';
    const sun930 = sunDuties.filter(d => d.hour === '9:30').map(m => m.user).join(", ") || '<i>Brak</i>';
    const sun1100 = sunDuties.filter(d => d.hour === '11:00').map(m => m.user).join(", ") || '<i>Brak</i>';

    let rows = `
        <tr>
            <td style="padding:14px; border-bottom:2px solid #5A0F1A; font-size:16px; vertical-align:top; background:#FAF6F0; width:150px;"><b>NIEDZIELA</b></td>
            <td style="padding:14px; border-bottom:2px solid #5A0F1A; font-size:15px; vertical-align:top; background:#FAF6F0;">
                <div style="margin-bottom:8px;"><b>Godzina 07:30:</b> ${sun730}</div>
                <div style="margin-bottom:8px;"><b>Godzina 09:30:</b> ${sun930}</div>
                <div><b>Godzina 11:00:</b> ${sun1100}</div>
            </td>
        </tr>
    `;

    // Reszta dni tygodnia
    const weekDays = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
    weekDays.forEach(day => {
        const dutiesOnDay = localFixedDuties.filter(d => d.day === day);
        const mins = dutiesOnDay.filter(d => d.type === 'ministrant' || !d.type).map(m => m.user).join(", ");
        const leks = dutiesOnDay.filter(d => d.type === 'lektor' || d.type === 'ceremoniarz').map(m => m.user).join(", ");
        
        rows += `
            <tr>
                <td style="padding:14px; border-bottom:1px solid #E2E8F0; font-size:16px; vertical-align:top; width:150px;"><b>${day}</b></td>
                <td style="padding:14px; border-bottom:1px solid #E2E8F0; font-size:15px; vertical-align:top;">
                    <div style="margin-bottom:6px;"><b>Ministranci:</b> ${mins || '<i>Brak</i>'}</div>
                    <div><b>Lektorzy / Ceremoniarze:</b> ${leks || '<i>Brak</i>'}</div>
                </td>
            </tr>`;
    });

    win.document.write(`
        <html>
        <head>
            <title>Grafik Stały Służb - Parafia Ruda</title>
            <style>
                body { font-family: 'Arial', sans-serif; color: #2F050A; padding: 40px; text-align: center; background: #ffffff; }
                .border-box { border: 5px double #5A0F1A; padding: 40px; max-width: 750px; margin: 0 auto; }
                .header-title { font-size: 30px; font-weight: 900; color: #5A0F1A; text-transform: uppercase; letter-spacing: 1px; }
                .sub { font-size: 20px; text-transform: uppercase; color: #2F050A; margin-top: 12px; font-weight: bold; border-bottom: 3px solid #5A0F1A; padding-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; margin-top: 30px; text-align: left; }
                th { background: #5A0F1A; color: white; padding: 12px; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; }
                .footer-stamp { text-align: center; font-size: 13px; color: #5A0F1A; font-weight: bold; margin-top: 50px; letter-spacing: 2px; }
            </style>
        </head>
        <body>
            <div class="border-box">
                <div class="header-title">Liturgiczna Służba Ołtarza</div>
                <div class="sub">Grafik Stały Służb</div>
                <table>
                    <thead>
                        <tr><th>Dzień Tygodnia</th><th>Obsada i Godziny Służby</th></tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <div class="footer-stamp">KRÓLUJ NAM CHRYSTE! — PARAFIA RUDA</div>
            </div>
        </body>
        </html>
    `);
    win.document.close(); 
    win.print();
};

// WYDRUK OFICJALNEGO RANKINGU PUNKTOWEGO
window.generateRankingReportPDF = function() {
    if(currentUserData.role !== 'admin') return;
    const win = window.open('', '_blank'); 
    let rows = '';
    const sorted = [...allUsers].sort((a,b) => b.points - a.points);
    
    sorted.forEach((u, i) => {
        rows += `
            <tr>
                <td style="padding:14px; border-bottom:1px solid #E2E8F0; font-size:16px; text-align:center; width:80px;"><b>${i+1}</b></td>
                <td style="padding:14px; border-bottom:1px solid #E2E8F0; font-size:16px;"><b>${u.name}</b></td>
                <td style="padding:14px; border-bottom:1px solid #E2E8F0; font-size:16px; text-align:right; color:#5A0F1A; font-weight:900;">${u.points || 0} pkt</td>
            </tr>`;
    });

    win.document.write(`
        <html>
        <head>
            <title>Ranking LSO</title>
            <style>
                body { font-family: 'Arial', sans-serif; color: #2F050A; padding: 40px; text-align: center; background: #ffffff; }
                .border-box { border: 5px double #5A0F1A; padding: 40px; max-width: 750px; margin: 0 auto; }
                .header-title { font-size: 30px; font-weight: 900; color: #5A0F1A; text-transform: uppercase; letter-spacing: 1px; }
                .sub { font-size: 20px; text-transform: uppercase; color: #2F050A; margin-top: 12px; font-weight: bold; border-bottom: 3px solid #5A0F1A; padding-bottom: 25px; }
                table { width: 100%; border-collapse: collapse; margin-top: 30px; text-align: left; }
                th { background: #5A0F1A; color: white; padding: 12px; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; }
                .footer-stamp { text-align: center; font-size: 13px; color: #5A0F1A; font-weight: bold; margin-top: 50px; letter-spacing: 2px; }
            </style>
        </head>
        <body>
            <div class="border-box">
                <div class="header-title">Liturgiczna Służba Ołtarza</div>
                <div class="sub">Aktualny Ranking Punktowy</div>
                <table>
                    <thead>
                        <tr><th style="text-align:center;">Miejsce</th><th>Imię i Nazwisko</th><th style="text-align:right;">Suma punktów</th></tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <div class="footer-stamp">KRÓLUJ NAM CHRYSTE! — PARAFIA RUDA</div>
            </div>
        </body>
        </html>
    `);
    win.document.close(); 
    win.print();
};

window.switchTab = function(id) {
    document.querySelectorAll('.tab-view').forEach(s => s.classList.add('hidden'));
    const targetTab = document.getElementById(`tab-${id}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    document.querySelectorAll('.menu-item').forEach(b => b.classList.toggle('active', b.id === `nav-${id}`));
    
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('mobile-open');
    }
};