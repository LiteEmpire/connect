const supabase = window.connectSupabase;
const form = document.querySelector("form");
const message = document.querySelector("#auth-message");

function showMessage(text, type = "error") {
  if (!message) return;
  message.textContent = text;
  message.className = "auth-message " + type;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: window.location.origin + "/connect/"
          }
        });

        if (error) throw error;

        if (data.session) {
          window.location.href = "index.html";
        } else {
          showMessage("Account created. Check your email to confirm your account, then sign in.", "success");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "index.html";
      }
    } catch (error) {
      showMessage(error.message || "Something went wrong.");
    } finally {
      button.disabled = false;
    }
  });
}