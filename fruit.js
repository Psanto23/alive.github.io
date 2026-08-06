// ============================================================
// 1. FIREBASE SETUP
// Replace this with the config object Firebase gives you when
// you register a Web App (see setup steps). Do this before
// anything will work.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBV59qVTu3qT7rBVZhx90f228iMwJy2r9k",
  authDomain: "alive-internet-fruits.firebaseapp.com",
  databaseURL: "https://alive-internet-fruits-default-rtdb.firebaseio.com",
  projectId: "alive-internet-fruits",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const votesRef = db.ref('fruitVotes');

// ============================================================
// 2. WHITELIST
// Only fruits on this list can ever be selected or counted.
// This is the spam guard: there is no free-text submission path.
// Add/remove fruits here as you like.
// ============================================================
const FRUIT_LIST = [
  "Apple", "Apricot", "Banana", "Blackberry", "Blueberry",
  "Boysenberry", "Breadfruit", "Cantaloupe", "Cherry", "Clementine",
  "Coconut", "Cranberry", "Currant", "Date", "Dragon fruit", "Durian",
  "Elderberry", "Fig", "Gooseberry", "Grape", "Grapefruit", "Guava",
  "Honeydew", "Jackfruit", "Jujube", "Kiwi", "Kumquat", "Lemon", "Lime",
  "Lychee", "Mandarin", "Mango", "Mangosteen", "Melon", "Mulberry",
  "Nectarine", "Olive", "Orange", "Papaya", "Passion fruit", "Peach",
  "Pear", "Persimmon", "Pineapple", "Plantain", "Plum", "Pomegranate",
  "Pomelo", "Prune", "Quince", "Raisin", "Rambutan", "Raspberry",
  "Star fruit", "Strawberry", "Tamarind", "Tangerine", "Watermelon"
];
const VALID_FRUIT_SET = new Set(FRUIT_LIST.map(f => f.toLowerCase()));

// ============================================================
// 3. DEVICE IDENTITY
// A random ID stored in localStorage acts as this browser's
// "seat" in the poll. Re-voting overwrites the same seat instead
// of adding a new one, so one device = one vote, and switching
// your choice just replaces it.
// ============================================================
let deviceId = localStorage.getItem('fruitPollDeviceId');
if (!deviceId) {
  deviceId = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('fruitPollDeviceId', deviceId);
}
let currentVote = localStorage.getItem('fruitPollCurrentVote');

// ============================================================
// 4. AUTOCOMPLETE SEARCH BOX
// ============================================================
const searchInput = document.getElementById('fruitSearch');
const suggestionsEl = document.getElementById('suggestions');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  suggestionsEl.innerHTML = '';
  if (!q) return;

  const matches = FRUIT_LIST
    .filter(f => f.toLowerCase().includes(q))
    .slice(0, 8);

  matches.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name; // textContent, not innerHTML: safe even though this is a fixed list
    li.addEventListener('click', () => selectFruit(name));
    suggestionsEl.appendChild(li);
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) {
    suggestionsEl.innerHTML = '';
  }
});

function selectFruit(name) {
  searchInput.value = '';
  suggestionsEl.innerHTML = '';
  vote(name);
}

// ============================================================
// 5. VOTING
// Writes/overwrites this device's single record in Firebase.
// ============================================================
function vote(name) {
  if (!VALID_FRUIT_SET.has(name.toLowerCase())) return; // extra guard

  votesRef.child(deviceId).set({
    fruit: name,
    ts: Date.now()
  });

  localStorage.setItem('fruitPollCurrentVote', name);
  currentVote = name;

  document.getElementById('votedFruit').textContent = name;
  document.getElementById('votedMsg').classList.add('show');
}

// ============================================================
// 6. LIVE RESULTS
// Recomputes tallies from scratch every time the data changes,
// ignoring any record whose fruit isn't on the whitelist.
// ============================================================
votesRef.on('value', (snapshot) => {
  const all = snapshot.val() || {};
  const counts = {};

  Object.values(all).forEach(record => {
    if (!record || typeof record.fruit !== 'string') return;
    if (!VALID_FRUIT_SET.has(record.fruit.toLowerCase())) return; // ignore tampered entries
    counts[record.fruit] = (counts[record.fruit] || 0) + 1;
  });

  renderResults(counts);
});

function renderResults(counts) {
  const chartBars = document.getElementById('chartBars');
  const statsBody = document.getElementById('statsBody');
  const totalVotesDiv = document.getElementById('totalVotes');
  const yAxis = document.getElementById('yAxis');

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  // Chart shows every fruit on the whitelist, including ones with 0 votes,
  // sorted by votes (ties broken alphabetically). Scrolls horizontally
  // since there are ~60 of them.
  const top = FRUIT_LIST
    .map(name => [name, counts[name] || 0])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const maxVotes = Math.max(...top.map(([, v]) => v), 1);

  yAxis.innerHTML = '';
  const step = Math.max(1, Math.ceil(maxVotes / 5));
  for (let i = maxVotes; i >= 0; i -= step) {
    const label = document.createElement('div');
    label.className = 'y-label';
    label.textContent = i;
    yAxis.appendChild(label);
  }

  chartBars.innerHTML = '';
  top.forEach(([name, votes]) => {
    const height = (votes / maxVotes) * 100;

    const barWrapper = document.createElement('div');
    barWrapper.className = 'bar-wrapper';

    const bar = document.createElement('div');
    bar.className = 'bar-column';
    bar.style.height = height + '%';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'bar-value';
    valueSpan.textContent = votes;
    bar.appendChild(valueSpan);

    const label = document.createElement('div');
    label.className = 'bar-label';
    label.textContent = name;

    barWrapper.appendChild(bar);
    barWrapper.appendChild(label);
    chartBars.appendChild(barWrapper);
  });

  // Table shows every fruit that has at least one vote
  statsBody.innerHTML = '';
  entries.forEach(([name, votes]) => {
    const percentage = total > 0 ? Math.round((votes / total) * 100) : 0;
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = name;
    const votesCell = document.createElement('td');
    votesCell.textContent = votes;
    const pctCell = document.createElement('td');
    pctCell.textContent = percentage + '%';

    row.appendChild(nameCell);
    row.appendChild(votesCell);
    row.appendChild(pctCell);
    statsBody.appendChild(row);
  });

  totalVotesDiv.textContent = `Total Votes: ${total}`;
  document.getElementById('results').classList.add('show');
}

// ============================================================
// 7. INITIAL STATE FOR A RETURNING VOTER
// ============================================================
if (currentVote) {
  document.getElementById('votedFruit').textContent = currentVote;
  document.getElementById('votedMsg').classList.add('show');
}