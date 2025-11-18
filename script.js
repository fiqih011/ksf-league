// =============================================
// KSF LEAGUE — script.js (SUPABASE v2 READY)
// =============================================

// ---------------------------
// ERROR HELPER
// ---------------------------
function handleError(context, err) {
  console.error(context, err);
  if (err) alert("Gagal load data.");
}

// ---------------------------
// GLOBAL STATE
// ---------------------------
let state = {
  leagueName: "",
  teams: [],
  fixtures: []
};

// ---------------------------
// DOM ELEMENTS
// ---------------------------
const navStandings = document.getElementById("navStandings");
const navFixtures = document.getElementById("navFixtures");
const navAdmin = document.getElementById("navAdmin");

const pageStandings = document.getElementById("pageStandings");
const pageFixtures = document.getElementById("pageFixtures");
const pageAdmin = document.getElementById("pageAdmin");

const leagueNameEl = document.getElementById("leagueName");
const leagueNameInput = document.getElementById("leagueNameInput");
const saveLeagueBtn = document.getElementById("saveLeagueBtn");

const teamNameInput = document.getElementById("teamName");
const teamListEl = document.getElementById("teamList");
const template = document.getElementById("teamActionsTemplate");
const addTeamBtn = document.getElementById("addTeamBtn");

const generateBtn = document.getElementById("generateBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

const fixturesTbody = document.querySelector("#fixturesTable tbody");
const standingsTbody = document.querySelector("#standingsTable tbody");

const darkToggle = document.getElementById("darkToggle");

const exportJSON = document.getElementById("exportJSON");
const importJSON = document.getElementById("importJSON");
const downloadStandings = document.getElementById("downloadStandings");
const downloadFixtures = document.getElementById("downloadFixtures");

// ---------------------------
// UTIL
// ---------------------------
function escapeHtml(t) {
  return (t || "").toString().replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
  );
}

// ---------------------------
// PAGE SWITCHING
// ---------------------------
function showPage(p) {
  pageStandings.classList.add("hidden");
  pageFixtures.classList.add("hidden");
  pageAdmin.classList.add("hidden");

  navStandings.classList.remove("active");
  navFixtures.classList.remove("active");
  navAdmin.classList.remove("active");

  p.classList.remove("hidden");

  if (p === pageStandings) navStandings.classList.add("active");
  if (p === pageFixtures) navFixtures.classList.add("active");
  if (p === pageAdmin) navAdmin.classList.add("active");
}

// ---------------------------
// SUPABASE CLIENT (V2)
// ---------------------------
function supa() {
  if (!window.supabase) throw new Error("Supabase client missing!");
  return window.supabase;
}
// ---------------------------
// LOAD DATA
// ---------------------------
async function loadData() {
  try {
    // league_info
    const { data: leagueData, error: leagueErr } = await supa()
      .from("league_info")
      .select("league_name")
      .eq("id", 1)
      .maybeSingle();

    if (leagueErr) handleError("load league", leagueErr);
    state.leagueName = leagueData?.league_name || "";

    // teams
    const { data: teams, error: teamErr } = await supa()
      .from("teams")
      .select("*")
      .order("name", { ascending: true });

    if (teamErr) return handleError("load teams", teamErr);
    state.teams = teams;

    // fixtures
    const { data: fixtures, error: fixturesErr } = await supa()
      .from("fixtures")
      .select("*")
      .order("round", { ascending: true });

    if (fixturesErr) return handleError("load fixtures", fixturesErr);
    state.fixtures = fixtures;

    renderLeagueHeader();
    renderTeams();
    renderFixtures();
    renderStandings();
  } catch (err) {
    handleError("loadData", err);
  }
}

// ---------------------------
// SAVE LEAGUE NAME
// ---------------------------
saveLeagueBtn.onclick = async () => {
  const name = leagueNameInput.value.trim();
  if (!name) return alert("Nama liga kosong!");

  const { error } = await supa()
    .from("league_info")
    .upsert({ id: 1, league_name: name }, { onConflict: "id" });

  if (error) return handleError("save league", error);

  state.leagueName = name;
  renderLeagueHeader();
};

function renderLeagueHeader() {
  leagueNameEl.textContent = state.leagueName;
  leagueNameInput.value = state.leagueName;
}

// ---------------------------
// TEAM MANAGEMENT
// ---------------------------
addTeamBtn.onclick = addTeam;
teamNameInput.onkeypress = e => { if (e.key === "Enter") addTeam(); };

async function addTeam() {
  const name = teamNameInput.value.trim();
  if (!name) return alert("Masukkan nama tim");

  if (state.teams.some(t => t.name.toLowerCase() === name.toLowerCase()))
    return alert("Nama tim sudah ada!");

  const { data, error } = await supa()
    .from("teams")
    .insert([{ name }])
    .select();

  if (error) return handleError("add team", error);

  state.teams.push(data[0]);
  teamNameInput.value = "";
  renderTeams();
}

async function deleteTeam(id) {
  if (!confirm("Hapus tim ini? Semua jadwal ikut terhapus.")) return;

  await supa().from("fixtures").delete().or(`home_id.eq.${id},away_id.eq.${id}`);
  await supa().from("teams").delete().eq("id", id);

  await loadData();
}

async function editTeamName(id) {
  const t = state.teams.find(x => x.id === id);
  const newName = prompt("Nama baru:", t.name);
  if (!newName) return;

  const { error } = await supa()
    .from("teams")
    .update({ name: newName })
    .eq("id", id);

  if (error) return handleError("edit team", error);

  await loadData();
}

function renderTeams() {
  teamListEl.innerHTML = "";
  state.teams.forEach(t => {
    const li = document.createElement("li");
    li.className = "team-item";

    li.innerHTML = `
      <div>${escapeHtml(t.name)}</div>
      <div style="display:flex; gap:6px;">
        <button class="small-btn" onclick="editTeamName(${t.id})">Edit</button>
        <button class="small-btn" style="background:#d9534f" onclick="deleteTeam(${t.id})">Hapus</button>
      </div>
    `;

    teamListEl.appendChild(li);
  });
}
// ---------------------------
// FIXTURE RENDER
// ---------------------------
function getTeamNameById(id) {
  const t = state.teams.find(x => x.id === id);
  return t ? t.name : "-";
}

function renderFixtures() {
  fixturesTbody.innerHTML = "";

  state.fixtures.forEach(m => {
    const tr = document.createElement("tr");

    const gh = m.gh ?? "";
    const ga = m.ga ?? "";

    tr.innerHTML = `
      <td>${m.round}</td>
      <td class="left">${escapeHtml(getTeamNameById(m.home_id))}</td>
      <td><input type="number" min="0" class="score" value="${gh}" onchange="onScoreChange(${m.id}, this.value, 'gh')" /></td>
      <td>vs</td>
      <td><input type="number" min="0" class="score" value="${ga}" onchange="onScoreChange(${m.id}, this.value, 'ga')" /></td>
      <td class="left">${escapeHtml(getTeamNameById(m.away_id))}</td>
      <td>${(m.gh != null && m.ga != null) ? "DONE" : "PENDING"}</td>
    `;

    fixturesTbody.appendChild(tr);
  });
}

// ---------------------------
// UPDATE SCORE
// ---------------------------
window.onScoreChange = async (id, val, key) => {
  const num = val === "" ? null : parseInt(val);

  const { data: old, error } = await supa()
    .from("fixtures")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return handleError("get fixture", error);

  const newStatus =
    Number.isInteger(key === "gh" ? num : old.gh) &&
    Number.isInteger(key === "ga" ? num : old.ga)
      ? "DONE"
      : "PENDING";

  const payload = {};
  payload[key] = num;
  payload.status = newStatus;

  await supa().from("fixtures").update(payload).eq("id", id);

  await loadData();
};

// ---------------------------
// STANDINGS
// ---------------------------
function getTeamForm(id) {
  const last = state.fixtures
    .filter(m => m.gh != null && m.ga != null && (m.home_id === id || m.away_id === id))
    .slice(-5);

  return last
    .map(m => {
      if (m.home_id === id) {
        if (m.gh > m.ga) return "🟢";
        if (m.gh < m.ga) return "🔴";
        return "⚪";
      } else {
        if (m.ga > m.gh) return "🟢";
        if (m.ga < m.gh) return "🔴";
        return "⚪";
      }
    })
    .join(" ");
}

function getRankClass(pos) {
  if (pos === 1) return "rank-champion";
  if (pos <= 4) return "rank-ucl";
  if (pos >= state.teams.length - 2) return "rank-relegation";
  return "";
}

function renderStandings() {
  const table = {};
  state.teams.forEach(t => {
    table[t.id] = { team: t, P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0 };
  });

  state.fixtures.forEach(m => {
    if (m.gh == null || m.ga == null) return;

    const home = table[m.home_id];
    const away = table[m.away_id];

    home.P++; away.P++;
    home.GF += m.gh; home.GA += m.ga;
    away.GF += m.ga; away.GA += m.gh;

    if (m.gh > m.ga) { home.W++; away.L++; home.Pts += 3; }
    else if (m.ga > m.gh) { away.W++; home.L++; away.Pts += 3; }
    else { home.D++; away.D++; home.Pts++; away.Pts++; }

    home.GD = home.GF - home.GA;
    away.GD = away.GF - away.GA;
  });

  const rows = Object.values(table).sort((a,b) =>
    b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF
  );

  standingsTbody.innerHTML = "";
  rows.forEach((r,i) => {
    const tr = document.createElement("tr");
    tr.className = getRankClass(i+1);

    tr.innerHTML = `
      <td>${i+1}</td>
      <td class="left">${escapeHtml(r.team.name)}</td>
      <td>${r.P}</td>
      <td>${r.W}</td>
      <td>${r.D}</td>
      <td>${r.L}</td>
      <td>${r.GF}</td>
      <td>${r.GA}</td>
      <td>${r.GD}</td>
      <td><b>${r.Pts}</b></td>
      <td>${getTeamForm(r.team.id)}</td>
    `;
    standingsTbody.appendChild(tr);
  });
}

// ---------------------------
// DARK MODE
// ---------------------------
const DARK_KEY = "ksf_dark";
if (localStorage.getItem(DARK_KEY) === "1") {
  document.body.classList.add("dark");
  darkToggle.checked = true;
}

darkToggle.onchange = () => {
  const enabled = darkToggle.checked;
  document.body.classList.toggle("dark", enabled);
  localStorage.setItem(DARK_KEY, enabled ? "1" : "0");
};

// ---------------------------
// NAV
// ---------------------------
navStandings.onclick = () => showPage(pageStandings);
navFixtures.onclick = () => showPage(pageFixtures);
navAdmin.onclick = () => showPage(pageAdmin);

// ---------------------------
// INIT
// ---------------------------
async function init() {
  await loadData();
  showPage(pageStandings);
}

init();
