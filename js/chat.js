const supabase = window.connectSupabase;
const messagesEl = document.querySelector("#messages");
const form = document.querySelector("#message-form");
const input = document.querySelector("#message-input");
const statusEl = document.querySelector("#status");

let currentUser = null;
let liteId = null;
let realtimeChannel = null;

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

function formatTime(value) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function renderMessage(message) {
  const mine = message.sender_id === currentUser.id;
  const wrapper = document.createElement("div");
  wrapper.className = "chat-message " + (mine ? "mine" : "theirs");
  wrapper.innerHTML = `
    <div class="bubble">${escapeText(message.body)}</div>
    <span>${mine ? "You" : "Lite"} · ${formatTime(message.created_at)}</span>
  `;
  messagesEl.appendChild(wrapper);
}

async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("id,sender_id,recipient_id,body,created_at")
    .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  messagesEl.innerHTML = "";
  if (!data.length) {
    messagesEl.innerHTML = '<div class="empty-state">No messages yet. Say hello to Lite 👋</div>';
    return;
  }
  data.forEach(renderMessage);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function ensureProfile() {
  const username = currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "User";
  await supabase.from("profiles").upsert(
    { id: currentUser.id, username },
    { onConflict: "id" }
  );
}

async function start() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    window.location.href = "login.html?next=chat.html";
    return;
  }

  currentUser = session.user;
  await ensureProfile();

  const { data: lite, error: liteError } = await supabase
    .from("profiles")
    .select("id,username")
    .eq("username", "Lite")
    .single();

  if (liteError || !lite) {
    throw new Error("Lite's chat account could not be found.");
  }

  liteId = lite.id;
  statusEl.textContent = "Online · replies appear here in real time";
  await loadMessages();

  realtimeChannel = supabase
    .channel("direct-chat-" + currentUser.id)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages"
    }, payload => {
      const message = payload.new;
      if (
        (message.sender_id === currentUser.id && message.recipient_id === liteId) ||
        (message.sender_id === liteId && message.recipient_id === currentUser.id)
      ) {
        if (!document.querySelector('[data-message-id="' + message.id + '"]')) {
          const empty = messagesEl.querySelector(".empty-state");
          if (empty) empty.remove();
          const before = messagesEl.children.length;
          renderMessage(message);
          messagesEl.lastElementChild.dataset.messageId = message.id;
          if (messagesEl.children.length > before) messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      }
    })
    .subscribe();
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const body = input.value.trim();
  if (!body || !liteId || !currentUser) return;

  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.id,
      recipient_id: liteId,
      body
    });
    if (error) throw error;
    input.value = "";
    input.focus();
  } catch (error) {
    alert(error.message || "Could not send the message.");
  } finally {
    button.disabled = false;
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") window.location.href = "login.html";
});

start().catch(error => {
  console.error(error);
  statusEl.textContent = "Could not load chat";
  messagesEl.innerHTML = '<div class="empty-state">Something went wrong. Please try again.</div>';
});