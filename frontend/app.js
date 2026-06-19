// NOTE: replace this with your deployed backend URL if the frontend is not served from the same host.
const API_BASE = "http://localhost:8000";

const scrollArea = document.getElementById("scrollArea");
const messagesEl = document.getElementById("messages");
const chatBox = document.getElementById("chatBox");
const joinBox = document.getElementById("joinBox");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");
const whoLabel = document.getElementById("whoLabel");

let username = localStorage.getItem("taz_username") || "";
let nextId = 2;
let typing = false;

const messages = [
  { id: 1, type: "taz", name: "Taz", ts: Date.now(),
    text: "Hi, I'm Taz — your DEAP manual assistant. Mention @Taz in any message and I'll pull in guidance from the Dwelling Energy Assessment Procedure manual." }
];

function fmtTime(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function segmentsHtml(text) {
  return escapeHtml(text).replace(/@taz/ig, m => `<span class="mention">${m}</span>`);
}

function render() {
  messagesEl.innerHTML = "";

  for (const m of messages) {
    const isTaz = m.type === "taz";
    const row = document.createElement("div");
    row.className = "row " + (isTaz ? "taz" : "human");

    if (isTaz) {
      const avatar = document.createElement("div");
      avatar.className = "avatar msg";
      avatar.textContent = "T";
      row.appendChild(avatar);
    }

    const col = document.createElement("div");
    col.className = "col";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<span class="name">${escapeHtml(m.name)}</span><span class="time">${fmtTime(m.ts)}</span>`;

    const bubble = document.createElement("div");
    bubble.className = "bubble " + (isTaz ? "taz" : "human");
    bubble.innerHTML = segmentsHtml(m.text);

    col.appendChild(meta);
    col.appendChild(bubble);
    row.appendChild(col);
    messagesEl.appendChild(row);
  }

  if (typing) {
    const row = document.createElement("div");
    row.className = "typing-row";
    row.innerHTML = `
      <div class="avatar msg">T</div>
      <div class="typing-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    messagesEl.appendChild(row);
  }

  scrollArea.scrollTop = scrollArea.scrollHeight;
}

function showRoom() {
  whoLabel.textContent = username;
  joinBox.classList.add("hidden");
  chatBox.classList.remove("hidden");
  msgInput.focus();
}

function joinRoom() {
  const n = nameInput.value.trim();
  if (!n) return;
  username = n;
  localStorage.setItem("taz_username", n);
  showRoom();
}

async function send() {
  const text = msgInput.value.trim();
  if (!text) return;

  messages.push({ id: nextId++, type: "human", name: username || "You", text, ts: Date.now() });
  msgInput.value = "";
  render();

  if (/@taz/i.test(text)) {
    typing = true;
    render();
    try {
      // NOTE: this fetch call may need to be replaced/adjusted depending on how the
      // backend is deployed (different host/port, auth headers, error handling, etc.)
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username || "You", message: text })
      });
      const data = await res.json();
      typing = false;
      messages.push({ id: nextId++, type: "taz", name: "Taz", ts: Date.now(), text: data.bot_reply || "I could not find that in the DEAP manual." });
    } catch (err) {
      typing = false;
      messages.push({ id: nextId++, type: "taz", name: "Taz", ts: Date.now(), text: "Sorry, I couldn't reach the server. Please try again." });
    }
    render();
  }

  msgInput.focus();
}

sendBtn.addEventListener("click", send);
msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

joinBtn.addEventListener("click", joinRoom);
nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    joinRoom();
  }
});

render();
if (username) {
  showRoom();
} else {
  nameInput.focus();
}
