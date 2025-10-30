
/*
  Prosty frontend bez backend — dane są w pamięci/localStorage.
  Admin może: przydzielać funkcje, przyznawać/odejmować punkty, dodawać służby (kalendarz),
  dodawać ogłoszenia. Użytkownik — tylko odczyt.
  Edytuj listę użytkowników w users variable (poniżej) przed startem aplikacji.
*/

// ---- Konfiguracja użytkowników (admin może edytować plik) ----
const usersSample = (() => {
  // 25 przykładowych użytkowników; 'user1' to ADMIN z hasłem 'adminpass'
  const arr = [];
  for(let i=1;i<=25;i++){
    arr.push({
      id: i,
      username: 'user' + i,
      password: (i===1) ? 'adminpass' : ('pass' + i),
      role: (i===1) ? 'admin' : 'user',
      points: 0,
      function: '',
    });
  }
  return arr;
})();

// ---- Persistence helpers ----
const DBKEY = 'lso_db_v1';
function loadDB(){
  const raw = localStorage.getItem(DBKEY);
  if(raw) return JSON.parse(raw);
  const initial = { users: usersSample, announcements: [], shifts: [] };
  localStorage.setItem(DBKEY, JSON.stringify(initial));
  return initial;
}
function saveDB(db){ localStorage.setItem(DBKEY, JSON.stringify(db)); }

let DB = loadDB();
let currentUser = null;

// ---- UI helpers ----
const content = document.getElementById('content');
const userBadge = document.getElementById('userBadge');

function showLogin(){
  document.getElementById('loginModal').style.display='flex';
}
function hideLogin(){ document.getElementById('loginModal').style.display='none'; }

document.getElementById('closeLogin').onclick = hideLogin;
document.getElementById('loginBtn').onclick = () => {
  const name = document.getElementById('loginName').value.trim();
  const pass = document.getElementById('loginPass').value;
  const u = DB.users.find(x => x.username === name && x.password === pass);
  if(!u){ alert('Nieprawidłowy login/hasło'); return; }
  currentUser = u;
  hideLogin();
  renderView('dashboard');
  updateBadge();
};

// initial badge
userBadge.onclick = () => {
  if(!currentUser) showLogin();
  else if(confirm('Wylogować?')){ currentUser = null; updateBadge(); renderView('dashboard'); }
};

function updateBadge(){
  if(!currentUser) userBadge.textContent = 'Zaloguj się';
  else userBadge.textContent = (currentUser.role === 'admin' ? 'Administrator' : 'Użytkownik') + ' — ' + currentUser.username;
}

// nav
document.querySelectorAll('.nav-btn').forEach(b=>{
  b.addEventListener('click', e=>{
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    renderView(b.dataset.view);
  });
});

// ---- Render views ----
function renderView(view){
  if(view === 'dashboard') return renderDashboard();
  if(view === 'profile') return renderProfile();
  if(view === 'calendar') return renderCalendar();
  if(view === 'announcements') return renderAnnouncements();
  content.innerHTML = '<div class="card">Brak widoku</div>';
}

function renderDashboard(){
  content.innerHTML = '';
  // If admin, show admin controls
  if(currentUser && currentUser.role === 'admin'){
    const card = elCard(`<h3 class="h1">Przyznawanie funkcji</h3><div class="small">Wybierz użytkownika, przypisz funkcję</div>`);
    const select = document.createElement('select');
    select.style.margin='12px 0';
    DB.users.forEach(u => { const o = document.createElement('option'); o.value=u.id; o.textContent = u.username + ' ('+u.role+')'; select.appendChild(o); });
    const input = document.createElement('input'); input.placeholder='np. Ministrant światła'; input.style.padding='8px';
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Przyznaj funkcję';
    btn.onclick = ()=>{
      const uid = +select.value; const fn = input.value.trim();
      if(!fn){ alert('Wpisz funkcję'); return; }
      const u = DB.users.find(x=>x.id===uid); u.function = fn; saveDB(DB); alert('Funkcja przypisana'); renderDashboard();
    };
    card.appendChild(select); card.appendChild(input); card.appendChild(btn);
    content.appendChild(card);

    // Points
    const card2 = elCard('<h3 class="h2">Punkty</h3>');
    const sel2 = document.createElement('select'); sel2.style.margin='8px 0';
    DB.users.forEach(u => { const o = document.createElement('option'); o.value=u.id; o.textContent = u.username + ' — ' + u.points + ' pkt'; sel2.appendChild(o); });
    const num = document.createElement('input'); num.type='number'; num.value=1; num.style.width='80px'; num.style.marginRight='8px';
    const add = document.createElement('button'); add.className='btn'; add.textContent='Dodaj';
    const sub = document.createElement('button'); sub.className='btn'; sub.textContent='Odejmij';
    add.onclick = ()=>{ const u = DB.users.find(x=>x.id==+sel2.value); u.points += Math.abs(+num.value||0); saveDB(DB); alert('Dodano'); renderDashboard(); }
    sub.onclick = ()=>{ const u = DB.users.find(x=>x.id==+sel2.value); u.points -= Math.abs(+num.value||0); if(u.points<0)u.points=0; saveDB(DB); alert('Odejęto'); renderDashboard(); }
    card2.appendChild(sel2); card2.appendChild(num); card2.appendChild(add); card2.appendChild(sub);
    content.appendChild(card2);

    // Shifts
    const card3 = elCard('<h3 class="h2">Dodawanie służby</h3>');
    const date = document.createElement('input'); date.type='date';
    const who = document.createElement('select'); who.style.margin='8px 0';
    DB.users.forEach(u => { const o = document.createElement('option'); o.value=u.id; o.textContent=u.username; who.appendChild(o); });
    const addShift = document.createElement('button'); addShift.className='btn'; addShift.textContent='Dodaj służbę';
    addShift.onclick = ()=>{
      if(!date.value){ alert('Wybierz datę'); return; }
      DB.shifts.push({id:Date.now(), date:date.value, userId:+who.value});
      saveDB(DB); alert('Służba dodana'); renderDashboard();
    };
    card3.appendChild(date); card3.appendChild(who); card3.appendChild(addShift);
    content.appendChild(card3);

    // Announcements admin quick
    const card4 = elCard('<h3 class="h2">Ogłoszenia</h3>');
    const annText = document.createElement('textarea'); annText.placeholder='Treść ogłoszenia'; annText.style.width='100%'; annText.style.height='60px';
    const post = document.createElement('button'); post.className='btn'; post.textContent='Opublikuj';
    post.onclick = ()=>{ if(!annText.value.trim()){alert('Wpisz treść');return;} DB.announcements.unshift({id:Date.now(), text:annText.value.trim(), author:currentUser.username, date:new Date().toISOString()}); saveDB(DB); annText.value=''; alert('Opublikowano'); renderDashboard(); }
    card4.appendChild(annText); card4.appendChild(post);
    content.appendChild(card4);
  }

  // Common: points quick view and announcements
  const pointsCard = elCard('<h3 class="h2">Punkty</h3>');
  if(currentUser) pointsCard.appendChild(txtEl('Masz punktów: ' + currentUser.points));
  else pointsCard.appendChild(txtEl('Zaloguj się aby zobaczyć swoje punkty'));
  content.appendChild(pointsCard);

  const annCard = elCard('<h3 class="h2">Ogłoszenia</h3>');
  if(DB.announcements.length===0) annCard.appendChild(txtEl('Brak ogłoszeń'));
  else{
    DB.announcements.slice(0,5).forEach(a=>{
      const d = document.createElement('div'); d.style.marginTop='8px';
      d.innerHTML = `<strong>${a.author}</strong> — <span class="small">${new Date(a.date).toLocaleString()}</span><div>${a.text}</div>`;
      annCard.appendChild(d);
    });
  }
  content.appendChild(annCard);
}

function renderProfile(){
  content.innerHTML='';
  const card = elCard('<h3 class="h1">Profil użytkownika</h3>');
  if(!currentUser){ card.appendChild(txtEl('Zaloguj się aby zobaczyć profil.')); content.appendChild(card); return; }
  card.appendChild(elRow('Funkcja', currentUser.function || 'Brak funkcji'));
  card.appendChild(elRow('Punkty', ''+currentUser.points));
  content.appendChild(card);

  const ann = elCard('<h3 class="h2">Ogłoszenia</h3>');
  if(DB.announcements.length===0) ann.appendChild(txtEl('Brak ogłoszeń'));
  else DB.announcements.slice(0,5).forEach(a=> ann.appendChild(txtEl(a.text)));
  content.appendChild(ann);
}

function renderCalendar(){
  content.innerHTML='';
  const card = elCard('<h3 class="h1">Kalendarz służb</h3>');
  if(DB.shifts.length===0) card.appendChild(txtEl('Brak dodanych służb'));
  else{
    const list = document.createElement('div');
    DB.shifts.sort((a,b)=>a.date.localeCompare(b.date)).forEach(s=>{
      const u = DB.users.find(x=>x.id===s.userId);
      const row = document.createElement('div'); row.style.padding='10px 0'; row.style.borderBottom='1px solid rgba(11,34,50,0.04)';
      row.innerHTML = `<strong>${s.date}</strong> — ${u ? u.username : '—'} ${u && u.function ? '('+u.function+')' : ''}`;
      list.appendChild(row);
    });
    card.appendChild(list);
  }
  content.appendChild(card);
}

// ---- small helpers ----
function elCard(html){
  const d = document.createElement('div'); d.className='card'; d.innerHTML = html; return d;
}
function txtEl(text){ const p = document.createElement('div'); p.className='small'; p.textContent = text; return p; }
function elRow(title, value){ const r = document.createElement('div'); r.style.padding='12px 0'; r.innerHTML = `<div class="h2">${title}</div><div class="small">${value}</div>`; return r; }

// initial render
renderView('dashboard');
updateBadge();
