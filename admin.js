import { auth, db } from './firebase-config.js';
import { collection, getDocs, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

async function loadUsers(){
  const list = document.getElementById('admin-app');
  list.innerHTML = '<h3>Użytkownicy</h3><div id="users-list"></div>';
  const snap = await getDocs(query(collection(db,'users'), orderBy('imie')));
  const ul = document.getElementById('users-list');
  snap.forEach(d=>{ const data=d.data(); const li = document.createElement('div'); li.className='card-mini row'; li.innerHTML = `<strong>${data.imie||''} ${data.nazwisko||''}</strong> <small>${data.email||''}</small>`; ul.appendChild(li); });
}

window.addEventListener('DOMContentLoaded', loadUsers);
