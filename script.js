// ====================================================
// KSF LEAGUE — FINAL SCRIPT (PREMIUM VERSION)
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
  Swal.fire({
    icon: "error",
    title: "Terjadi Kesalahan!",
    text: err?.message || context,
    confirmButtonColor: "#d33"
  });
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

// ====================================================
// LOAD DATA
// ====================================================
async function loadData() {
  try {
    const { data: leagueData, error: leagueErr } = await supa()
      .from("league_info")
      .select("league_name")
      .eq("id", 1)
      .maybeSingle();

    if (leagueErr) return handleError("load league_info", leagueErr);

    state.leagueName = leagueData?.league_name || "";
    leagueNameEl.textContent = state.leagueName;
    leagueNameInput.value = state.leagueName;

    const { data: teams, error: teamsErr } = await supa()
      .from("teams")
      .select("*")
      .order("name", { ascending: true });

    if (teamsErr) return handleError("load teams", teamsErr);
    state.teams = teams || [];

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
  const name = leagueNameInput.value.trim();
  if (!name) {
    return Swal.fire({
      icon: "warning",
      title: "Nama kosong",
      text: "Masukkan nama liga!",
      confirmButtonColor: "#7b2cbf"
    });
  }

  const { error } = await supa()
    .from("league_info")
    .upsert([{ id: 1, league_name: name }]);

  if (error) return handleError("save league", error);

  Swal.fire({
    icon: "success",
    title: "Nama liga disimpan",
    text: "Nama liga berhasil diperbarui.",
    confirmButtonColor: "#7b2cbf"
  });

  await loadData();
};

// ====================================================
// TEAM MANAGEMENT
// ====================================================
addTeamBtn.onclick = addTeam;
teamNameInput.onkeypress = e => { if (e.key === "Enter") addTeam(); };

async function addTeam() {
  const name = teamNameInput.value.trim();
  if (!name)
    return Swal.fire({
      icon: "warning",
      title: "Nama tim kosong",
      text: "Masukkan nama tim!",
      confirmButtonColor: "#7b2cbf"
    });

  if (state.teams.some(t => t.name.toLowerCase() === name.toLowerCase()))
    return Swal.fire({
      icon: "error",
      title: "Duplikat",
      text: "Nama tim sudah ada!",
      confirmButtonColor: "#d9534f"
    });

  const { error } = await supa().from("teams").insert([{ name }]);
  if (error) return handleError("addTeam", error);

  Swal.fire({
    icon: "success",
    title: "Tim ditambahkan",
    text: `"${name}" berhasil masuk daftar.`,
    confirmButtonColor: "#7b2cbf"
  });

  await loadData();
  teamNameInput.value = "";
}
// ====================================================
// EDIT NAMA TIM
// ====================================================
async function editTeamName(id) {
  const t = state.teams.find(x => x.id === id);
  if (!t) return;

  const { value: newName } = await Swal.fire({
    title: "Edit Nama Tim",
    input: "text",
    inputLabel: "Nama baru:",
    inputValue: t.name,
    confirmButtonText: "Simpan",
    showCancelButton: true,
    confirmButtonColor: "#7b2cbf",
    cancelButtonColor: "#6c757d"
  });

  if (!newName) return;

  const { error } = await supa()
    .from("teams")
    .update({ name: newName.trim() })
    .eq("id", id);

  if (error) return handleError("editTeamName", error);

  Swal.fire({
    icon: "success",
    title: "Berhasil!",
    text: "Nama tim diperbarui.",
    confirmButtonColor: "#7b2cbf"
  });

  await loadData();
}

// ====================================================
// HAPUS TIM
// ====================================================
async function deleteTeam(id) {
  const t = state.teams.find(x => x.id === id);

  const ok = await Swal.fire({
    icon: "warning",
    title: `Hapus tim "${t.name}"?`,
    text: "Semua jadwal terkait juga ikut terhapus!",
    showCancelButton: true,
    confirmButtonColor: "#d9534f",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Hapus"
  });

  if (!ok.isConfirmed) return;

  await supa().from("fixtures")
    .delete()
    .or(`home_id.eq.${id},away_id.eq.${id}`);

  await supa().from("teams").delete().eq("id", id);

  Swal.fire({
    icon: "success",
    title: "Tim dihapus",
    text: "Tim & seluruh jadwal berhasil dihapus.",
    confirmButtonColor: "#7b2cbf"
  });

  await loadData();
}

// ====================================================
// RENDER LIST TIM
// ====================================================
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
// FIXTURES — PREMIUM EDIT / SAVE / CANCEL
// ====================================================
function getTeamNameById(id) {
  const t = state.teams.find(x => x.id === id);
  return t ? t.name : "-";
}

function renderFixtures() {
  fixturesTbody.innerHTML = "";

  state.fixtures.forEach(m => {
    const gh = m.gh ?? "";
    const ga = m.ga ?? "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
  <td>${m.match_no ?? ""}</td>
  <td>${m.round}</td>
  <td class="left">${escapeHtml(getTeamNameById(m.home_id))}</td>

      <td><input type="number" id="gh-${m.id}" value="${gh}" class="score" disabled></td>
      <td>vs</td>
      <td><input type="number" id="ga-${m.id}" value="${ga}" class="score" disabled></td>

      <td class="left">${escapeHtml(getTeamNameById(m.away_id))}</td>

      <td id="status-${m.id}" class="${(m.gh != null && m.ga != null) ? "status-done" : "status-pending"}">
        ${(m.gh != null && m.ga != null) ? "DONE" : "PENDING"}
      </td>

      <td>
        <button class="action-btn edit" id="edit-${m.id}">Edit</button>
        <button class="action-btn save hidden" id="save-${m.id}">Save</button>
        <button class="action-btn cancel hidden" id="cancel-${m.id}">Cancel</button>
      </td>
    `;
    fixturesTbody.appendChild(tr);

    // EDIT MODE
    document.getElementById(`edit-${m.id}`).onclick = () => {
      document.getElementById(`gh-${m.id}`).disabled = false;
      document.getElementById(`ga-${m.id}`).disabled = false;

      document.getElementById(`edit-${m.id}`).classList.add("hidden");
      document.getElementById(`save-${m.id}`).classList.remove("hidden");
      document.getElementById(`cancel-${m.id}`).classList.remove("hidden");
    };

    // SAVE SCORE (SweetAlert2)
document.getElementById(`save-${m.id}`).onclick = async () => {
  const newGh = document.getElementById(`gh-${m.id}`).value;
  const newGa = document.getElementById(`ga-${m.id}`).value;

  // Jika dua-duanya kosong → reset skor (PENDING)
  if (newGh === "" && newGa === "") {
    await supa().from("fixtures").update({
      gh: null,
      ga: null
    }).eq("id", m.id);

    await loadData();

    return Swal.fire({
      icon: "success",
      title: "Skor dihapus",
      text: "Pertandingan kembali ke status PENDING.",
      confirmButtonColor: "#7b2cbf"
    });
  }

  // Jika salah satu kosong → error
  if (newGh === "" || newGa === "") {
    return Swal.fire({
      icon: "warning",
      title: "Skor belum lengkap",
      text: "Isi skor Home dan Away.",
      confirmButtonColor: "#7b2cbf"
    });
  }

  // Jika dua-duanya angka → simpan normal & status DONE
  const payload = {
    gh: parseInt(newGh),
    ga: parseInt(newGa),
  };

  await supa().from("fixtures").update(payload).eq("id", m.id);

  await loadData();

  Swal.fire({
    icon: "success",
    title: "Skor tersimpan!",
    timer: 1200,
    showConfirmButton: false
  });
};
    // CANCEL EDIT
    document.getElementById(`cancel-${m.id}`).onclick = () => {
      document.getElementById(`gh-${m.id}`).value = gh;
      document.getElementById(`ga-${m.id}`).value = ga;

      document.getElementById(`gh-${m.id}`).disabled = true;
      document.getElementById(`ga-${m.id}`).disabled = true;

      document.getElementById(`edit-${m.id}`).classList.remove("hidden");
      document.getElementById(`save-${m.id}`).classList.add("hidden");
      document.getElementById(`cancel-${m.id}`).classList.add("hidden");

      Swal.fire({
        icon: "info",
        title: "Dibatalkan",
        timer: 900,
        showConfirmButton: false
      });
    };
  });
}

// ====================================================
// GENERATE FIXTURES — PREMIUM SWEETALERT2
// ====================================================
generateBtn.onclick = async () => {
  if (state.teams.length < 2) {
    return Swal.fire({
      icon: "error",
      title: "Tidak cukup tim!",
      text: "Minimal harus ada 2 tim.",
      confirmButtonColor: "#7b2cbf"
    });
  }

  const ok = await Swal.fire({
    icon: "warning",
    title: "Generate ulang jadwal?",
    text: "Semua jadwal lama akan dihapus!",
    showCancelButton: true,
    confirmButtonColor: "#7b2cbf",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Lanjutkan"
  });

  if (!ok.isConfirmed) return;

  try {
    // salin tim dari state
    let teams = state.teams.map(t => ({ id: t.id, name: t.name }));

    // Jika jumlah tim ganjil → tambah BYE
    let hasBye = false;
    if (teams.length % 2 !== 0) {
      teams.push({ id: null, name: "BYE" });
      hasBye = true;
    }

    const n = teams.length;            // total slot (termasuk BYE)
    const roundsPerLeg = n - 1;        // jumlah ronde per leg (format FIFA)
    const matchesPerRound = n / 2;

    // hapus fixtures lama
    await supa().from("fixtures").delete().neq("id", UUID_SENTINEL);

    let fixtures = [];
    let matchNo = 1;

    // -------------------------------
    //  LEG 1 — BERGER TABLE
    // -------------------------------
    let arr = [...teams];

    for (let r = 1; r <= roundsPerLeg; r++) {
      for (let i = 0; i < matchesPerRound; i++) {
        let home = arr[i];
        let away = arr[n - 1 - i];

        if (home.id !== null && away.id !== null) {
          fixtures.push({
            round: r,
            match_no: matchNo++,
            home_id: home.id,
            away_id: away.id
          });
        }
      }

      // rotasi FIFA (circle method)
      const anchor = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr = [anchor, ...rest];
    }

    // -------------------------------
    //  LEG 2 — BERGER TABLE (ULANG) + SWAP
    // -------------------------------
    arr = [...teams]; // reset ke posisi awal

    for (let r = 1; r <= roundsPerLeg; r++) {
      for (let i = 0; i < matchesPerRound; i++) {
        let home = arr[i];
        let away = arr[n - 1 - i];

        // swap home & away untuk leg ke-2
        if (home.id !== null && away.id !== null) {
          fixtures.push({
            round: r + roundsPerLeg,
            match_no: matchNo++,
            home_id: away.id,
            away_id: home.id
          });
        }
      }

      // rotasi ulang Berger
      const anchor = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr = [anchor, ...rest];
    }

    // safety: hapus kalau ada self-match (harusnya tidak ada)
    fixtures = fixtures.filter(f => f.home_id !== f.away_id);

    // simpan
    await supa().from("fixtures").insert(fixtures);
    await loadData();

    Swal.fire({
      icon: "success",
      title: "Jadwal resmi FIFA/FC26 berhasil dibuat!",
      confirmButtonColor: "#7b2cbf"
    });

  } catch (err) {
    handleError("generate fixtures", err);
  }
};

// ====================================================
// STANDINGS CALCULATION (TIDAK DIUBAH)
// ====================================================
function renderStandings() {
  const table = {};

  state.teams.forEach(t => {
    table[t.id] = {
      id: t.id,
      name: t.name,
      p: 0, w: 0, d: 0, l: 0,
      gf: 0, ga: 0, gd: 0,
      pts: 0,
      form: []
    };
  });

  state.fixtures.forEach(m => {
    if (m.gh == null || m.ga == null) return;

    const home = table[m.home_id];
    const away = table[m.away_id];

    home.p++; away.p++;
    home.gf += m.gh; home.ga += m.ga;
    away.gf += m.ga; away.ga += m.gh;

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (m.gh > m.ga) {
      home.w++; away.l++;
      home.pts += 3;
      home.form.push("W");
      away.form.push("L");
    } else if (m.gh < m.ga) {
      away.w++; home.l++;
      away.pts += 3;
      away.form.push("W");
      home.form.push("L");
    } else {
      home.d++; away.d++;
      home.pts++; away.pts++;
      home.form.push("D");
      away.form.push("D");
    }
  });

  Object.values(table).forEach(t => {
    t.form = t.form.slice(-5);
  });

  const standings = Object.values(table).sort((a, b) =>
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.name.localeCompare(b.name)
  );

  standingsTbody.innerHTML = "";

  standings.forEach((t, i) => {
    const tr = document.createElement("tr");

    let cls = "";
    if (i === 0) cls = "leader";
    if (i >= standings.length - 2) cls = "relegation";
    tr.className = cls;

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td class="left">${escapeHtml(t.name)}</td>
      <td>${t.p}</td>
      <td>${t.w}</td>
      <td>${t.d}</td>
      <td>${t.l}</td>
      <td>${t.gf}</td>
      <td>${t.ga}</td>
      <td>${t.gd}</td>
      <td>${t.pts}</td>
      <td class="last5-container">
        ${t.form.map(f => {
          const cls = f === "W" ? "win" : f === "D" ? "draw" : "lose";
          return `<span class="form-badge ${cls}">${f}</span>`;
        }).join("")}
      </td>
    `;

    standingsTbody.appendChild(tr);
  });
}

// ====================================================
// RESET ALL — PASSWORD + SWEETALERT2
// ====================================================
resetAllBtn.onclick = async () => {
  const { value: pass } = await Swal.fire({
    title: "Password Admin",
    input: "password",
    inputLabel: "Masukkan password untuk mereset semua data:",
    inputPlaceholder: "••••••••",
    showCancelButton: true,
    confirmButtonText: "Lanjut",
    confirmButtonColor: "#d9534f",
    cancelButtonColor: "#6c757d"
  });

  if (!pass) return;

  if (pass !== "Admin2025#") {
    return Swal.fire({
      icon: "error",
      title: "Password salah!",
      text: "Reset dibatalkan.",
      confirmButtonColor: "#d33"
    });
  }

  const ok = await Swal.fire({
    icon: "warning",
    title: "Reset Semua Data?",
    text: "Tindakan ini TIDAK bisa dibatalkan.",
    showCancelButton: true,
    confirmButtonText: "Ya, reset!",
    confirmButtonColor: "#d9534f"
  });

  if (!ok.isConfirmed) return;

  await supa().from("fixtures").delete().neq("id", UUID_SENTINEL);
  await supa().from("teams").delete().neq("id", UUID_SENTINEL);
  await supa().from("league_info").update({ league_name: "" }).eq("id", 1);

  await loadData();

  Swal.fire({
    icon: "success",
    title: "Semua data berhasil direset!",
    confirmButtonColor: "#28a745"
  });
};

// ====================================================
// INITIALIZE
// ====================================================
async function init() {
  showPage(pageStandings);
  await loadData();
}

init();
