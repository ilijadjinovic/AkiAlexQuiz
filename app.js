import { auth, db, GoogleAuthProvider, signInWithPopup,
         signOut, onAuthStateChanged, doc, getDoc, setDoc,
         collection, getDocs, addDoc, deleteDoc, query, orderBy }
  from './firebase.js';

import { initialQuestions } from './questions.js';

// ── Config ───────────────────────────────────────────────
const ADMIN_EMAILS = [
  'ilija.djinovic@gmail.com', 'akialexdj@gmail.com'
];

// ── State ────────────────────────────────────────────────
let currentUser = null;
let allQuestions = [];

// ── Tab switching ────────────────────────────────────────
window.switchTab = function (name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'admin') renderAdmin();
};

// ── Admin guard ──────────────────────────────────────────
function renderAdmin() {
  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);
  document.getElementById('admin-content').style.display = isAdmin ? 'block' : 'none';
  document.getElementById('admin-locked').style.display  = isAdmin ? 'none'  : 'block';
  if (isAdmin) loadAdminQuestions();
}

// ── Leaderboard ──────────────────────────────────────────
function renderLeaderboard(entries) {
  const list = document.getElementById('leaderboardList');
  const rankClasses = ['gold', 'silver', 'bronze'];
  const avatarClasses = ['av-blue', 'av-teal', 'av-purple', 'av-red'];
  list.innerHTML = entries.map((e, i) => {
    const displayName = e.name;
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `
      <li class="leaderboard-item">
        <span class="rank ${rankClasses[i] || ''}">${i + 1}</span>
        <div class="avatar ${avatarClasses[i % avatarClasses.length]}">${initials}</div>
        <span class="lb-name">${displayName}</span>
        <span class="lb-score">${e.score}<span class="lb-pts">pt</span></span>
      </li>`;
  }).join('');
}

// ── Nickname ─────────────────────────────────────────────
window.saveNickname = async function () {
  const input = document.getElementById('nicknameInput');
  const hint  = document.getElementById('nicknameHint');
  const nick  = input.value.trim();
  if (!currentUser) { hint.style.color = '#e85050'; hint.textContent = 'Mora biti prijavljen.'; return; }
  if (!nick)        { hint.style.color = '#e85050'; hint.textContent = 'Nadimak ne sme biti prazan.'; return; }
  await setDoc(doc(db, 'users', currentUser.uid), { nickname: nick }, { merge: true });
  hint.style.color = '#2da87a';
  hint.textContent = 'Nadimak sačuvan ✓';
  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = nick;
};

window.onNicknameInput = function () {
  document.getElementById('nicknameHint').textContent = '';
};

function getDisplayName(user, firestoreNick) {
  if (!user) return 'Igrač';
  return firestoreNick || user.displayName || user.email.split('@')[0];
}

// ── Profile ──────────────────────────────────────────────
function renderProfile(user, nickname) {
  const card = document.getElementById('profileCard');
  if (user) {
    card.style.display = 'flex';
    const displayName = getDisplayName(user, nickname);
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent   = displayName;
    document.getElementById('profileEmail').textContent  = user.email;
    document.getElementById('loginBtn').textContent      = 'Odjavi se';
    if (nickname) document.getElementById('nicknameInput').value = nickname;
  } else {
    card.style.display = 'none';
    document.getElementById('nicknameInput').value = '';
    document.getElementById('nicknameHint').textContent = '';
    document.getElementById('loginBtn').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      Prijavi se Google nalogom`;
  }
}

// ── Auth ─────────────────────────────────────────────────
window.handleLogin = async function () {
  if (currentUser) {
    await signOut(auth);
  } else {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }
};

// ── Quiz ─────────────────────────────────────────────────
window.createRoom = function () {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  document.getElementById('roomInfo').textContent = `Kod sobe: ${code}`;
};

window.joinRoom = function () {
  const code = document.getElementById('roomCode').value.trim().toUpperCase();
  if (!code) return;
  document.getElementById('roomInfo').textContent = `Priključuješ se sobi: ${code}`;
};

// ── Admin actions ────────────────────────────────────────
window.adminClearRooms       = () => confirm('Obriši sve sobe?')         && alert('Sobe obrisane.');
window.adminResetLeaderboard = () => confirm('Resetuj tabelu rezultata?') && alert('Tabela resetovana.');

// ── Admin: Questions ─────────────────────────────────────
const SUBJECTS = ['Matematika', 'Srpski jezik', 'Priroda i društvo', 'Nemački jezik'];

async function loadAdminQuestions() {
  const q = query(collection(db, 'questions'), orderBy('subject'));
  const snap = await getDocs(q);
  allQuestions = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  renderQuestionList();
  updateQuestionCount();
}

function updateQuestionCount() {
  const el = document.getElementById('adminQuestionCount');
  if (el) el.textContent = allQuestions.length;
}

function renderQuestionList() {
  const container = document.getElementById('adminQuestionList');
  if (!container) return;

  const filterSubject = document.getElementById('adminSubjectFilter')?.value || '';
  const filterText    = document.getElementById('adminSearchFilter')?.value.toLowerCase() || '';

  const filtered = allQuestions.filter(q => {
    const matchSubject = !filterSubject || q.subject === filterSubject;
    const matchText    = !filterText    || q.question.toLowerCase().includes(filterText);
    return matchSubject && matchText;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color:#3c4060;font-size:13px;padding:12px 0;">Nema pitanja.</p>';
    return;
  }

  container.innerHTML = filtered.map(q => `
    <div class="admin-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:flex-start;gap:8px;">
        <div>
          <span class="tag tag-blue" style="margin-bottom:4px;">${q.subject}</span>
          <p style="font-size:13px;color:#c8ccd8;margin-top:4px;line-height:1.4;">${q.question}</p>
        </div>
        <button class="admin-action-btn danger" onclick="deleteQuestion('${q.firestoreId}')" style="flex-shrink:0;">
          <i class="ti ti-trash"></i>
        </button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${q.options.map((opt, i) => `
          <span style="font-size:11px;padding:2px 8px;border-radius:4px;
            background:${i === q.answer ? '#0f2e27' : '#13161f'};
            color:${i === q.answer ? '#2da87a' : '#3c4060'};
            border:0.5px solid ${i === q.answer ? '#1a4a3a' : '#1e2130'};">
            ${String.fromCharCode(65+i)}. ${opt}
          </span>`).join('')}
      </div>
    </div>`).join('');
}

window.deleteQuestion = async function (firestoreId) {
  if (!confirm('Obriši ovo pitanje?')) return;
  await deleteDoc(doc(db, 'questions', firestoreId));
  allQuestions = allQuestions.filter(q => q.firestoreId !== firestoreId);
  renderQuestionList();
  updateQuestionCount();
};

window.adminFilterQuestions = function () {
  renderQuestionList();
};

window.adminAddQuestions = function () {
  const modal = document.getElementById('addQuestionModal');
  if (modal) modal.style.display = 'flex';
};

window.closeAddQuestion = function () {
  const modal = document.getElementById('addQuestionModal');
  if (modal) modal.style.display = 'none';
  document.getElementById('aqQuestion').value = '';
  document.getElementById('aqA').value = '';
  document.getElementById('aqB').value = '';
  document.getElementById('aqC').value = '';
  document.getElementById('aqD').value = '';
  document.getElementById('aqAnswer').value = '0';
  document.getElementById('aqSubject').value = SUBJECTS[0];
};

window.submitAddQuestion = async function () {
  const question = document.getElementById('aqQuestion').value.trim();
  const options  = [
    document.getElementById('aqA').value.trim(),
    document.getElementById('aqB').value.trim(),
    document.getElementById('aqC').value.trim(),
    document.getElementById('aqD').value.trim(),
  ];
  const answer  = parseInt(document.getElementById('aqAnswer').value);
  const subject = document.getElementById('aqSubject').value;

  if (!question || options.some(o => !o)) {
    alert('Popuni sva polja.');
    return;
  }

  const newQ = { subject, question, options, answer };
  const ref = await addDoc(collection(db, 'questions'), newQ);
  allQuestions.push({ firestoreId: ref.id, ...newQ });
  renderQuestionList();
  updateQuestionCount();
  closeAddQuestion();
};

// ── Seed initial questions ────────────────────────────────
async function seedQuestionsIfEmpty() {
  const snap = await getDocs(collection(db, 'questions'));
  if (!snap.empty) return;
  const batch = initialQuestions.map(q => {
    const { id, ...data } = q;
    return addDoc(collection(db, 'questions'), data);
  });
  await Promise.all(batch);
  console.log('Pitanja inicijalno učitana u Firestore.');
}

// ── Init ─────────────────────────────────────────────────
renderLeaderboard([
  { name: 'Test 1', score: 320 },
  { name: 'Test 2', score: 300 },
 // { name: 'Nikola P.', score: 3640 },
 //{ name: 'Stefan R.', score: 2810 },
]);

renderProfile(null);
renderAdmin();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  renderAdmin();
  if (user) {
    const ref  = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    let nickname = '';
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid, email: user.email, displayName: user.displayName,
        createdAt: new Date().toISOString(), nickname: '',
        stats: { quizzes: 0, correct: 0, points: 0 }
      });
    } else {
      nickname = snap.data().nickname || '';
    }
    renderProfile(user, nickname);
    await seedQuestionsIfEmpty();
  } else {
    renderProfile(null);
  }
});
