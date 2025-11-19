// ====================================================
// KSF LEAGUE — FINAL SUPER FIX + match_no
// ====================================================

// GLOBAL STATE
let state = {
  leagueName: "",
  teams: [],
  fixtures: []
};

// SENTINELS
const UUID_SENTINEL = "00000000-0000-0000-0000-000000000000"; 
const INT_SENTINEL = -1;

// ERROR HANDLER
function handleError(context, err) {
  console.error(context, err);
  alert("Error: " + (err?.message || context));
}

// SUPABASE CLIENT
function supa() {
  if (!window.supabase) throw new Error("Supabase client missing!");
  return window.supabase;
}

// HTML ESCAPE
function escapeHtml(t) {
  return (t || "").toString().replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
  );
}

// DOM ELEMENTS
const navStandings = document.getElementById("navStandings");
const navFixtures  = document.getElementById("navFixtures");
const navAdmin     = document.getElementById("navAdmin");

const pageStandings = document.getElementById("pageStandings");
const pageFixtures  = document.getElementById("pageFixtures");
const pageAdmin     = document.getElementById("pageAdmin");

const leagueNameEl   = document.getElementById("leagueName");
const leagueNameInput = document.getElementById("leagueNameInput");
const saveLeagueBtn  = document.getElementById("saveLeagueBtn");

const teamNameInput = document.getElementById("teamName");
const teamListEl    = document.getElementById("teamList");
const addTeamBtn    = document.getElementById("addTeamBtn");

const generateBtn = document.getElementById("generateBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

const fixturesTbody  = document.querySelector("#fixturesTable tbody");
const standingsTbody = document.querySelector("#standingsTable tbody");

const exportJSON   = document.getElementById("exportJSON");
const importJSON   = document.getElementById("importJSON");
const downloadStandings = document.getElementById("downloadStandings");
const downloadFixtures  = document.getElementById("downloadFixtures");

// ------------------------
// NAVIGATION
// ------------------------
function showPage(p) {
  pageStandings.classList.add("hidden");
  pageFixtures.classList.add("hidden");
  pageAdmin.classList.add("hidden");

  navStandings.classList.remove("active");
  navFixtures.classList.remove("active");
  navAdmin.classList.remove("active");

  p.classList.remove("hidden");

  if (p === pageStandings) navStandings.classList.add("active");
  if (p === pageFixtures)  navFixtures.classList.add("active");
  if (p === pageAdmin)     navAdmin.classList.add("active");
}

navStandings.onclick = () => showPage(pageStandings);
navFixtures.onclick  = () => showPage(pageFixtures);
navAdmin.onclick     = () => showPage(pageAdmin);

// ------------------------
// LOAD DATA
// ------------------------
async function loadData() {
  try {
    // LEAGUE NAME
    const { data: leagueData, error: leagueErr } = await supa()
      .from("league_info")
      .select("league_name")
      .eq("id", 1)
      .maybeSingle();

    if (leagueErr) return handleError("load league_info", leagueErr);

    state.leagueName = leagueData?.league_name || "";
    leagueNameEl.textContent = state.leagueName;
    leagueNameInput.value = state.leagueName;

    // TEAMS
    const { data: teams, error: teamsErr } = await supa()
      .from("teams")
      .select("*")
      .order("name", { ascending: true });

    if (teamsErr) return handleError("load teams", teamsErr);
    state.teams = teams || [];

    // FIXTURES (stable sort)
    const { data: fixtures, error: fixErr } = await supa()
      .from("fixtures")
      .select("*")
      .order("round", { ascending: true })
      .order("match_no", { ascending: true });

    if (fixErr) return handleError("load fixtures", fixErr);
    state.fixtures = fixtures || [];

    renderTeams();
    renderFixtures();
    renderStandings();
  } catch (err) {
    handleError("loadData crash", err);
  }
}

// ====================================================
// SAVE LEAGUE NAME
// ====================================================
saveLeagueBtn.onclick = async () => {
  try {
    const name = leagueNameInput.value.trim();
    if (!name) return alert("Nama liga tidak boleh kosong.");

    const { error } = await supa()
      .from("league_info")
      .upsert([{ id: 1, league_name: name }], { onConflict: "id" });

    if (error) return handleError("save league", error);

    await loadData();
  } catch (err) {
    handleError("save league crash", err);
  }
};

// ====================================================
// TEAM MANAGEMENT
// ====================================================

addTeamBtn.onclick = addTeam;
teamNameInput.onkeypress = e => { if (e.key === "Enter") addTeam(); };

async function addTeam() {
  try {
    const name = teamNameInput.value.trim();
    if (!name) return alert("Masukkan nama tim");

    if (state.teams.some(t => t.name.toLowerCase() === name.toLowerCase()))
      return alert("Nama tim sudah ada!");

    const { error } = await supa()
      .from("teams")
      .insert([{ name }]);

    if (error) return handleError("addTeam", error);

    await loadData();
    teamNameInput.value = "";
  } catch (err) {
    handleError("addTeam crash", err);
  }
}

async function editTeamName(id) {
  const t = state.teams.find(x => x.id === id);
  if (!t) return alert("Tim tidak ditemukan.");

  const newName = prompt("Nama baru:", t.name);
  if (!newName) return;

  const { error } = await supa()
    .from("teams")
    .update({ name: newName.trim() })
    .eq("id", id);

  if (error) return handleError("editTeamName", error);

  await loadData();
}

async function deleteTeam(id) {
  if (!confirm("Hapus tim ini dan seluruh jadwal yang terkait?")) return;

  const { error: fixErr } = await supa()
    .from("fixtures")
    .delete()
    .or(`home_id.eq.${id},away_id.eq.${id}`);

  if (fixErr) return handleError("deleteTeam fixtures", fixErr);

  const { error: teamErr } = await supa()
    .from("teams")
    .delete()
    .eq("id", id);

  if (teamErr) return handleError("deleteTeam", teamErr);

  await loadData();
}

function renderTeams() {
  teamListEl.innerHTML = "";
  state.teams.forEach(t => {
    const li = document.createElement("li");
    li.className = "team-item";
    li.innerHTML = `
      <div>${escapeHtml(t.name)}</div>
      <div style="display:flex;gap:6px;">
        <button class="small-btn edit">Edit</button>
        <button class="small-btn delete" style="background:#d9534f">Hapus</button>
      </div>
    `;
    li.querySelector(".edit").onclick = () => editTeamName(t.id);
    li.querySelector(".delete").onclick = () => deleteTeam(t.id);
    teamListEl.appendChild(li);
  });
}

// ====================================================
// FIXTURES
// ====================================================

function getTeamNameById(id) {
  const t = state.teams.find(x => x.id === id);
  return t ? t.name : "-";
}

function renderFixtures() {
  fixturesTbody.innerHTML = "";

  state.fixtures.forEach(m => {
    const gh = m.gh == null ? "" : m.gh;
    const ga = m.ga == null ? "" : m.ga;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.round}</td>
      <td class="left">${escapeHtml(getTeamNameById(m.home_id))}</td>
      <td><input type="number" min="0" value="${gh}"
          onchange="onScoreChange('${m.id}', this.value, 'gh')" class="score"></td>
      <td>vs</td>
      <td><input type="number" min="0" value="${ga}"
          onchange="onScoreChange('${m.id}', this.value, 'ga')" class="score"></td>
      <td class="left">${escapeHtml(getTeamNameById(m.away_id))}</td>
      <td>${(m.gh != null && m.ga != null) ? "DONE" : "PENDING"}</td>
    `;
    fixturesTbody.appendChild(tr);
  });
}

window.onScoreChange = async (id, val, key) => {
  try {
    const num = val === "" ? null : parseInt(val);

    const { data: old, error: oldErr } = await supa()
      .from("fixtures")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (oldErr) return handleError("updateScore get fixture", oldErr);

    const newGh = key === "gh" ? num : old.gh;
    const newGa = key === "ga" ? num : old.ga;
    const newStatus = (newGh != null && newGa != null) ? "DONE" : "PENDING";

    const payload = { status: newStatus };
    payload[key] = num;

    const { error } = await supa()
      .from("fixtures")
      .update(payload)
      .eq("id", id);

    if (error) return handleError("updateScore", error);

    await loadData();
  } catch (err) {
    handleError("updateScore crash", err);
  }
};

// ====================================================
// STANDINGS (KLASEMEN)
// ====================================================

function renderStandings() {
  standingsTbody.innerHTML = "";

  const stats = {};
  state.teams.forEach(t => {
    stats[t.id] = {
      id: t.id,
      name: t.name,
      P: 0, W: 0, D: 0, L: 0,
      GF: 0, GA: 0, GD: 0, Pts: 0,
      Form: []
    };
  });

  state.fixtures.forEach(m => {
    if (m.gh == null || m.ga == null) return;
    const home = stats[m.home_id];
    const away = stats[m.away_id];

    home.P++; away.P++;
    home.GF += m.gh; home.GA += m.ga;
    away.GF += m.ga; away.GA += m.gh;

    if (m.gh > m.ga) {
      home.W++; away.L++;
      home.Form.unshift("W");
      away.Form.unshift("L");
    } else if (m.gh < m.ga) {
      away.W++; home.L++;
      away.Form.unshift("W");
      home.Form.unshift("L");
    } else {
      home.D++; away.D++;
      home.Form.unshift("D");
      away.Form.unshift("D");
    }
  });

  Object.values(stats).forEach(t => {
    t.GD = t.GF - t.GA;
    t.Pts = t.W * 3 + t.D;
    t.Form = t.Form.slice(0, 5);
  });

  const ordered = Object.values(stats).sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    if (b.GD !== a.GD) return b.GD - a.GD;
    if (b.GF !== a.GF) return b.GF - a.GF;
    return a.name.localeCompare(b.name);
  });

  ordered.forEach((t, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(t.name)}</td>
      <td>${t.P}</td>
      <td>${t.W}</td>
      <td>${t.D}</td>
      <td>${t.L}</td>
      <td>${t.GF}</td>
      <td>${t.GA}</td>
      <td>${t.GD}</td>
      <td>${t.Pts}</td>
      <td>
        ${t.Form.map(f => {
          if (f === "W") return `<span class="form-badge win">W</span>`;
          if (f === "D") return `<span class="form-badge draw">D</span>`;
          if (f === "L") return `<span class="form-badge loss">L</span>`;
          return "";
        }).join("")}
      </td>
    `;
    standingsTbody.appendChild(tr);
  });
}

// ====================================================
// GENERATE DOUBLE ROUND ROBIN + match_no
// ====================================================

generateBtn.onclick = async () => {
  try {
    const { data: teams, error: tErr } = await supa()
      .from("teams")
      .select("*")
      .order("name", { ascending: true });

    if (tErr) return handleError("generate load teams", tErr);
    if (!teams || teams.length < 2)
      return alert("Minimal 2 tim diperlukan.");

    if (!confirm("Generate jadwal Double Round Robin?")) return;

    let arr = teams.map(t => ({ id: t.id }));
    const ghost = { id: null };
    if (arr.length % 2 === 1) arr.push(ghost);

    const rounds = arr.length - 1;
    const half = arr.length / 2;
    const first = [];

    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < half; i++) {
        const A = arr[i];
        const B = arr[arr.length - 1 - i];

        if (A.id && B.id) {
          const home = (r % 2 === 0) ? A : B;
          const away = (r % 2 === 0) ? B : A;

          first.push({
            round: r + 1,
            home_id: home.id,
            away_id: away.id,
            gh: null,
            ga: null,
            status: "PENDING"
          });
        }
      }

      arr = [arr[0], arr[arr.length - 1], ...arr.slice(1, arr.length - 1)];
    }

    const second = first.map(f => ({
      round: f.round + rounds,
      home_id: f.away_id,
      away_id: f.home_id,
      gh: null,
      ga: null,
      status: "PENDING"
    }));

    let allFixtures = [...first, ...second].sort((a, b) => a.round - b.round);

    let counter = 1;
    allFixtures = allFixtures.map(f => ({ ...f, match_no: counter++ }));

    const { error: delErr } = await supa()
      .from("fixtures")
      .delete()
      .neq("id", UUID_SENTINEL);

    if (delErr) return handleError("generate delete old fixtures", delErr);

    const { error: insErr } = await supa()
      .from("fixtures")
      .insert(allFixtures);

    if (insErr) return handleError("generate insert new fixtures", insErr);

    await loadData();
    alert("Generate jadwal sukses!");
  } catch (err) {
    handleError("generate crash", err);
  }
};

// ====================================================
// RESET
// ====================================================

resetAllBtn.onclick = async () => {
  try {
    if (!confirm("Yakin ingin menghapus semua data (teams, fixtures, league)?")) return;

    const { error: delF } = await supa()
      .from("fixtures")
      .delete()
      .neq("id", UUID_SENTINEL);
    if (delF) return handleError("reset fixtures", delF);

    const { error: delT } = await supa()
      .from("teams")
      .delete()
      .neq("id", UUID_SENTINEL);
    if (delT) return handleError("reset teams", delT);

    const { error: delL } = await supa()
      .from("league_info")
      .delete()
      .neq("id", INT_SENTINEL);
    if (delL) return handleError("reset league_info", delL);

    await loadData();
    alert("Reset sukses.");
  } catch (err) {
    handleError("reset crash", err);
  }
};

// ====================================================
// EXPORT JSON
// ====================================================

exportJSON.onclick = async () => {
  try {
    await loadData();
    const payload = {
      league: { league_name: state.leagueName },
      teams: state.teams,
      fixtures: state.fixtures
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${state.leagueName || "league"}_data.json`;
    a.click();
  } catch (err) {
    handleError("exportJSON", err);
  }
};

// ====================================================
// IMPORT JSON
// ====================================================

importJSON.onclick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const parsed = JSON.parse(evt.target.result);

        if (!parsed.teams || !parsed.fixtures || !parsed.league)
          return alert("Format JSON tidak sesuai.");

        if (!confirm("Import akan menimpa semua data. Lanjut?")) return;

        await supa().from("fixtures").delete().neq("id", UUID_SENTINEL);
        await supa().from("teams").delete().neq("id", UUID_SENTINEL);
        await supa().from("league_info").delete().neq("id", INT_SENTINEL);

        await supa().from("league_info").insert([{ id: 1, league_name: parsed.league.league_name }]);

        await supa().from("teams").insert(parsed.teams);

        let fix = parsed.fixtures.sort((a, b) => a.match_no - b.match_no);
        await supa().from("fixtures").insert(fix);

        await loadData();
        alert("Import JSON sukses.");
      } catch (err) {
        handleError("importJSON", err);
      }
    };
    reader.readAsText(f);
  };

  input.click();
};

// ====================================================
// DOWNLOAD EXCEL
// ====================================================

downloadStandings.onclick = () => {
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(document.getElementById("standingsTable"));
    XLSX.utils.book_append_sheet(wb, ws, "Standings");
    XLSX.writeFile(wb, "Standings.xlsx");
  } catch (err) {
    handleError("downloadStandings", err);
  }
};

downloadFixtures.onclick = () => {
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(document.getElementById("fixturesTable"));
    XLSX.utils.book_append_sheet(wb, ws, "Fixtures");
    XLSX.writeFile(wb, "Fixtures.xlsx");
  } catch (err) {
    handleError("downloadFixtures", err);
  }
};

// ====================================================
// INIT
// ====================================================

async function init() {
  await loadData();
  showPage(pageStandings);
}

init();
