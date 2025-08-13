// client/app.js

const authArea = document.getElementById("auth-area");
const voteArea = document.getElementById("vote-area");
const btnYes = document.getElementById("btn-yes");
const btnNo = document.getElementById("btn-no");
const yourVote = document.getElementById("your-vote");
const pYes = document.getElementById("p-yes");
const pNo = document.getElementById("p-no");
const barYes = document.getElementById("bar-yes");
const barNo = document.getElementById("bar-no");
const counters = document.getElementById("counters");
const messages = document.getElementById("messages");

let socket;
let loggedUser = null;
let lastVote = null;

function setAuthUI() {
  if (loggedUser) {
    authArea.innerHTML = `
      <div class="user">
        <img src="${loggedUser.avatar || "https://avatars.githubusercontent.com/u/0?v=4"}" alt="avatar">
        <span>${loggedUser.name || loggedUser.username}</span>
      </div>
      <form id="logout-form" class="inline">
        <button type="submit" class="link">Cerrar sesión</button>
      </form>
    `;
    voteArea.classList.remove("hidden");

    document.getElementById("logout-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await fetch("/auth/logout", { method: "POST" });
      location.reload();
    });
  } else {
    authArea.innerHTML = `
      <a class="btn" href="/auth/github">Iniciar sesión con GitHub</a>
    `;
    voteArea.classList.add("hidden");
  }
}

function updateResults(data) {
  pYes.textContent = `${data.pYes}%`;
  pNo.textContent = `${data.pNo}%`;
  barYes.style.width = data.pYes + "%";
  barNo.style.width = data.pNo + "%";
  counters.textContent = `Total votos: ${data.total} (Sí: ${data.yes} | No: ${data.no})`;
}

function showMsg(text) {
  messages.textContent = text;
  setTimeout(() => (messages.textContent = ""), 3000);
}

async function init() {
  // Comprobar si hay sesión: /api/profile (ruta protegida)
  const r = await fetch("/api/profile");
  if (r.ok) {
    const js = await r.json();
    loggedUser = js.user;
  } else {
    loggedUser = null;
  }
  setAuthUI();

  // Conectar Socket.IO (permite ver resultados aun sin login)
  socket = io();

  socket.on("results", (data) => updateResults(data));
  socket.on("error_msg", (txt) => showMsg(txt));

  btnYes.addEventListener("click", () => {
    if (!loggedUser) return showMsg("Debes iniciar sesión para votar.");
    lastVote = "yes";
    yourVote.textContent = "Tu voto: Sí";
    socket.emit("vote", "yes");
  });

  btnNo.addEventListener("click", () => {
    if (!loggedUser) return showMsg("Debes iniciar sesión para votar.");
    lastVote = "no";
    yourVote.textContent = "Tu voto: No";
    socket.emit("vote", "no");
  });
}

init();
