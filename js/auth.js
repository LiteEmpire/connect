const authClient = window.connectSupabase;
const form = document.querySelector("form");
const message = document.querySelector("#auth-message");

function showMessage(text, type = "error") {
  if (!message) return;
  message.textContent = text;
  message.className = "auth-message " + type;
}

async function saveProfile(user, username) {
  if (!user || !username) return;
  const { error } = await authClient.from("profiles").upsert(
    { id: user.id, username },
    { onConflict: "id" }
  );
  if (error) throw error;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    showMessage(form.dataset.mode === "signup" ? "Creating your account…" : "Signing you in…", "success");
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;

    try {
      const isSignup = form.dataset.mode === "signup";
      const email = form.querySelector("input[type='email']").value.trim();
      const password = form.querySelector("input[type='password']").value;

      if (isSignup) {
        const username = form.querySelector("input[name='username']").value.trim();
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error("Username must be 3–20 characters and use only letters, numbers, or underscores.");
        }
        if (username.toLowerCase() === "lite") {
          throw new Error("That username is reserved.");
        }

        const { data, error } = await authClient.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: window.location.origin + "/connect/"
          }
        });

        if (error) throw error;

        if (data.session) {
          await saveProfile(data.user, username);
          window.location.href = "index.html";
        } else {
          showMessage("Account created. Check your email to confirm your account, then sign in.", "success");
        }
      } else {
        const { data, error } = await authClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await saveProfile(data.user, data.user.user_metadata?.username || email.split("@")[0]);
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next || "index.html";
      }
    } catch (error) {
      showMessage(error.message || "Something went wrong.");
    } finally {
      button.disabled = false;
    }
  });
}