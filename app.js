// app.js - logika: rejestracja, logowanie, panel wyboru, admin actions
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp, addDoc, collection, runTransaction, query, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const $ = id => document.getElementById(id);

const init = ()=>{
  $('btn-register').onclick = register;
  $('btn-login').onclick = login;
  onAuthStateChanged(auth, handleAuth);
};

async function register(){
  const email = $('register-email').value.trim();
  const pass = $('register-password').value;
  const pass2 = $('register-password2').value;
  const imie = $('register-first').value.trim();
  const nazwisko = $('register-last').value.trim();
  const role = $('register-role').value || 'B';
  if(!email||!pass||pass!==pass2){ alert('Uzupełnij dane i upewnij się, że hasła są takie same.'); return; }
  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;
    await setDoc(doc(db,'users',uid), { email, imie, nazwisko, role, points:0, createdAt: serverTimestamp() });
    alert('Zarejestrowano! Możesz się zalogować.');
  }catch(e){ alert(e.message); }
}

async function login(){
  const email = $('login-email').value.trim();
  const pass = $('login-password').value;
  try{
    const cred = await signInWithEmailAndPassword(auth, email, pass);
  }catch(e){ alert(e.message); }
}

async function handleAuth(user){
  if(user){
    const snap = await getDoc(doc(db,'users',user.uid));
    const data = snap.data();
    const area = document.getElementById('user-area');
    area.innerHTML = `<div class="row"><span class="badge">${data.imie} ${data.nazwisko}</span> <button class="secondary" id="logout-btn">Wyloguj</button></div>`;
    document.getElementById('logout-btn').onclick = async ()=>{ await signOut(auth); location.reload(); };
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    if(data.role === 'A') loadAdminPanel();
    else loadUserPanel();
  } else {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('user-area').innerHTML = '';
  }
}

async function loadAdminPanel(){
  const panel = document.getElementById('admin-panel');
  panel.classList.remove('hidden');
  panel.innerHTML = `<h3>Panel Administratora</h3>
    <div class="card-mini">
      <h4>Użytkownicy</h4>
      <div id="users-list" class="list"></div>
    </div>
    <div class="card-mini">
      <h4>Przyznaj / Odejmij punkty</h4>
      <select id="points-user-select" class="select"></select>
      <input id="points-amount" type="number" placeholder="Ilość punktów">
      <button id="btn-pts-add">Dodaj</button><button id="btn-pts-sub">Odejmij</button>
    </div>
    <div class="card-mini">
      <h4>Dodaj służbę</h4>
      <label>Wybierz użytkownika:</label>
      <select id="duty-user" class="select"></select>
      <input id="duty-title" placeholder="Nazwa służby">
      <select id="duty-kind"><option value="one">Jednorazowa</option><option value="rec">Stała</option></select>
      <input id="duty-when" type="datetime-local">
      <select id="duty-weekday"><option value="1">Poniedziałek</option><option value="2">Wtorek</option><option value="3">Środa</option><option value="4">Czwartek</option><option value="5">Piątek</option><option value="6">Sobota</option><option value="0">Niedziela</option></select>
      <label>
       <input id="duty-kadzidla" type="checkbox"> Ministrant</label><br>
        <input id="duty-kadzidla" type="checkbox">Lektor</label><br>
      <input id="duty-kadzidla" type="checkbox"> Ministrant kadzidła</label><br>
      <input id="duty-kadzidla" type="checkbox"> Ministrant Światła</label><br>
      <input id="duty-kadzidla" type="checkbox"> Ministrant Krzyża</label><br>
      <input id="duty-kadzidla" type="checkbox"> Ministrant Wody</label><br>
      <input id="duty-kadzidla" type="checkbox"> Ministrant Księgi</label><br>
      <input id="duty-kadzidla" type="checkbox"> Ministrant Ołtaraza</label><br>
      
      <button id="btn-add-duty">Dodaj służbę</button>
    </div>
    <div class="card-mini">
      <h4>Ogłoszenia</h4>
      <textarea id="announcement-text" placeholder="Treść ogłoszenia"></textarea>
      <button id="btn-post-ann">Wywiesź ogłoszenie</button>
      <div id="ann-list"></div>
    </div>`;

  // load users into selects and list
  const q = query(collection(db,'users'), orderBy('imie'));
  const snap = await getDocs(q);
  const selPts = document.getElementById('points-user-select');
  const selDuty = document.getElementById('duty-user');
  const list = document.getElementById('users-list');
  selPts.innerHTML = '<option value="">Wybierz użytkownika</option>';
  selDuty.innerHTML = '<option value="">Wybierz użytkownika</option>';
  list.innerHTML = '';
  snap.forEach(d=>{
    const u=d.data(); const uid=d.id;
    const el = document.createElement('div'); el.className='row card-mini';
    el.innerHTML = `<strong>${u.imie} ${u.nazwisko}</strong> <small>${u.email||''}</small> <button onclick="viewUser('${uid}')">Podgląd</button> <button onclick="deleteUser('${uid}')">Usuń</button>`;
    list.appendChild(el);
    selPts.innerHTML += `<option value="${uid}">${u.imie} ${u.nazwisko}</option>`;
    selDuty.innerHTML += `<option value="${uid}">${u.imie} ${u.nazwisko}</option>`;
  });

  // wire UI: toggle weekday vs datetime
  const dutyKindEl = document.getElementById('duty-kind');
  const dutyWhenEl = document.getElementById('duty-when');
  const dutyWeekdayEl = document.getElementById('duty-weekday');
  const toggleKind = ()=>{
    if(dutyKindEl.value === 'rec'){
      dutyWeekdayEl.style.display = 'block';
      dutyWhenEl.style.display = 'none';
    } else {
      dutyWeekdayEl.style.display = 'none';
      dutyWhenEl.style.display = 'block';
    }
  };
  dutyKindEl.addEventListener('change', toggleKind);
  toggleKind();

  document.getElementById('btn-pts-add').onclick = ()=>modifyPoints(1);
  document.getElementById('btn-pts-sub').onclick = ()=>modifyPoints(-1);
  document.getElementById('btn-add-duty').onclick = addDuty;
  document.getElementById('btn-post-ann').onclick = postAnnouncement;
  loadAnnouncements();
}

async function modifyPoints(mult){
  const uid = document.getElementById('points-user-select').value;
  const val = Number(document.getElementById('points-amount').value);
  if(!uid||!val){ alert('Wybierz użytkownika i ilość'); return; }
  await runTransaction(db, async (t)=>{
    const ref = doc(db,'users',uid);
    const d = await t.get(ref);
    const cur = d.data().points||0;
    t.update(ref, { points: cur + mult*val });
  });
  alert('Punkty zmienione');
  loadAdminPanel();
}

async function addDuty(){
  const title = document.getElementById('duty-title').value.trim();
  const kind = document.getElementById('duty-kind').value;
  const when = document.getElementById('duty-when').value;
  const weekday = document.getElementById('duty-weekday').value;
  const user = document.getElementById('duty-user').value;
  const kadz = document.getElementById('duty-kadzidla').checked;
  if(!title||!user){ alert('Wypełnij nazwę i wybierz użytkownika'); return; }
  const docObj = { title, user, type: kadz? 'kadzidla':'ministrant', kind, meta:{kadzidla:kadz}, createdAt: serverTimestamp(), permanent: (kind==='rec') };
  if(kind==='one'){ docObj.when = when ? when.replace('T',' ') : null; }
  else{ docObj.weekday = Number(weekday); }
  await addDoc(collection(db,'duties'), docObj);
  alert('Służba dodana');
  loadAdminPanel();
}

async function postAnnouncement(){ const t = document.getElementById('announcement-text').value.trim(); if(!t) return alert('Brak tekstu'); await addDoc(collection(db,'announcements'), {text:t, createdAt: serverTimestamp()}); alert('Ogłoszenie dodane'); loadAnnouncements(); }
async function loadAnnouncements(){ const snap = await getDocs(query(collection(db,'announcements'), orderBy('createdAt','desc'))); const n=document.getElementById('ann-list'); n.innerHTML=''; snap.forEach(d=>{ const data=d.data(); const el=document.createElement('div'); el.className='card-mini row'; el.innerHTML=`<div>${data.text}</div><small>${data.createdAt?data.createdAt.toDate().toLocaleString():'-'}</small>`; n.appendChild(el); }); }

async function viewUser(uid){ const d = await getDoc(doc(db,'users',uid)); alert(JSON.stringify(d.data(),null,2)); }
async function deleteUser(uid){ if(!confirm('Usunąć użytkownika?')) return; await (await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')).deleteDoc(doc(db,'users',uid)); alert('Usunięto'); loadAdminPanel(); }

async function loadUserPanel(){
  const panel = document.getElementById('user-panel');
  panel.classList.remove('hidden');
  panel.innerHTML = `<h3>Panel Użytkownika</h3>
    <div id="my-info" class="card-mini"></div>
    <div id="my-duties" class="card-mini"><h4>Moje służby</h4><div id="duty-list"></div></div>
    <div id="my-messages" class="card-mini"><h4>Wiadomości</h4><div id="msg-list"></div></div>
    <div id="announcements-user" class="card-mini"><h4>Tablica ogłoszeń</h4><div id="ann-user-list"></div></div>`;

  const snap = await getDoc(doc(db,'users',auth.currentUser.uid));
  const d = snap.data();
  document.getElementById('my-info').innerHTML = `<strong>${d.imie} ${d.nazwisko}</strong><div>Punkty: <span class="badge">${d.points||0}</span></div>`;
  loadMyDuties();
  loadMessages();
  loadAnnouncementsUser();
}

async function loadMyDuties(){
  const list = document.getElementById('duty-list');
  list.innerHTML = '<em>Ładowanie...</em>';
  const q = query(collection(db,'duties'), where('user','==', auth.currentUser.uid));
  const snap = await getDocs(q);
  list.innerHTML = '';
  const days = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
  snap.forEach(d=>{
    const data = d.data();
    const el = document.createElement('div'); el.className='card-mini';
    if(data.kind === 'rec'){
      const wd = (typeof data.weekday !== 'undefined') ? days[data.weekday] : 'Dzień nieznany';
      el.innerHTML = `<strong>${data.title}</strong><div>Typ: stała (${wd})</div>${data.permanent?'<div><em>Przypisana na stałe</em></div>':''}${data.meta && data.meta.kadzidla?'<div>Funkcja: kadzidła</div>':''}`;
    } else {
      el.innerHTML = `<strong>${data.title}</strong><div>Typ: jednorazowa</div><div>Termin: ${data.when||'brak'}</div>${data.meta && data.meta.kadzidla?'<div>Funkcja: kadzidła</div>':''}`;
    }
    list.appendChild(el);
  });
}

async function loadMessages(){ const snap = await getDocs(query(collection(db,'messages'), orderBy('createdAt','desc'))); const list=document.getElementById('msg-list'); list.innerHTML=''; snap.forEach(d=>{ const data=d.data(); const el=document.createElement('div'); el.className='card-mini'; el.innerHTML=`<div><strong>Od:</strong> ${data.fromName||data.from}</div><div>${data.text}</div><small>${data.createdAt?data.createdAt.toDate().toLocaleString():'-'}</small>`; list.appendChild(el); }); }
async function loadAnnouncementsUser(){ const snap = await getDocs(query(collection(db,'announcements'), orderBy('createdAt','desc'))); const n=document.getElementById('ann-user-list'); n.innerHTML=''; snap.forEach(d=>{ const data=d.data(); const el=document.createElement('div'); el.className='card-mini'; el.innerHTML=`<div>${data.text}</div><small>${data.createdAt?data.createdAt.toDate().toLocaleString():'-'}</small>`; n.appendChild(el); }); }

window.addEventListener('DOMContentLoaded', init);
