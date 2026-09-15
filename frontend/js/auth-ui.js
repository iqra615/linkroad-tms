const AuthUI = (() => {
  function showLoginForm() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
  }
  function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
  }

  function applyUserToChrome(user) {
    document.getElementById('display-username').innerText = `User: ${user.name} (${user.role})`;
    document.getElementById('sidebar-users-tab').classList.toggle('hidden', user.role !== 'Administrator');
  }

  function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').style.display = 'flex';
  }

  function showLoginScreen() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-screen').classList.remove('hidden');
    showLoginForm();
  }

  async function enterApp(user) {
    State.currentUser = user;
    applyUserToChrome(user);
    showApp();
    await App.onLogin();
  }

  async function boot() {
    try {
      await Api.health();
    } catch {
      document.getElementById('boot-screen').classList.add('hidden');
      document.getElementById('server-down-screen').style.display = 'flex';
      return;
    }

    const token = Api.getToken();
    if (token) {
      try {
        const { user } = await Api.Auth.me();
        document.getElementById('boot-screen').classList.add('hidden');
        await enterApp(user);
        return;
      } catch {
        Api.setToken(null);
      }
    }

    document.getElementById('boot-screen').classList.add('hidden');
    showLoginScreen();
  }

  function wireEvents() {
    document.getElementById('showRegisterBtn').addEventListener('click', showRegisterForm);
    document.getElementById('showLoginBtn').addEventListener('click', showLoginForm);

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('loginError');
      errBox.classList.add('hidden');
      const btn = document.getElementById('loginSubmitBtn');
      btn.disabled = true;
      btn.innerText = 'Signing in…';

      try {
        const { user, token } = await Api.Auth.login({
          username: document.getElementById('loginUser').value.trim(),
          password: document.getElementById('loginPass').value
        });
        Api.setToken(token);
        document.getElementById('loginForm').reset();
        await enterApp(user);
      } catch (err) {
        errBox.innerText = describeApiError(err);
        errBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.innerText = 'Sign In';
      }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('registerError');
      errBox.style.display = 'none';

      try {
        const { user, token } = await Api.Auth.register({
          name: document.getElementById('regName').value.trim(),
          username: document.getElementById('regUser').value.trim(),
          password: document.getElementById('regPass').value
        });
        Api.setToken(token);
        document.getElementById('registerForm').reset();
        await enterApp(user);
      } catch (err) {
        errBox.innerText = describeApiError(err);
        errBox.style.display = 'block';
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      Api.setToken(null);
      State.currentUser = null;
      showLoginScreen();
    });

    document.addEventListener('linkroad:unauthorized', () => {
      State.currentUser = null;
      showLoginScreen();
      toast('Your session expired. Please sign in again.', 'error');
    });
  }

  return { boot, wireEvents, applyUserToChrome };
})();
