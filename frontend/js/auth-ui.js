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
    document.getElementById('userName').innerText = user.name;
    document.getElementById('userRole').innerText = user.role;
    document.getElementById('userAvatar').innerText = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('nav-users-btn').classList.toggle('hidden', user.role !== 'Administrator');
  }

  function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('flex');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('app').classList.add('flex');
  }

  function showLoginScreen() {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('app').classList.remove('flex');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-screen').classList.add('flex');
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
      document.getElementById('server-down-screen').classList.remove('hidden');
      document.getElementById('server-down-screen').classList.add('flex');
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
        Api.setToken(null); // stale/expired token
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
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in…';

      try {
        const { user, token } = await Api.Auth.login({
          username: document.getElementById('loginUser').value.trim(),
          password: document.getElementById('loginPass').value
        });
        Api.setToken(token);
        document.getElementById('loginForm').reset();
        await enterApp(user);
      } catch (err) {
        errBox.textContent = describeApiError(err);
        errBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
      }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('registerError');
      errBox.classList.add('hidden');

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
        errBox.textContent = describeApiError(err);
        errBox.classList.remove('hidden');
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      Api.setToken(null);
      State.currentUser = null;
      showLoginScreen();
    });

    // Fired by api.js whenever a request comes back 401 (e.g. expired token mid-session).
    document.addEventListener('linkroad:unauthorized', () => {
      State.currentUser = null;
      showLoginScreen();
      toast('Your session expired. Please sign in again.', 'error');
    });
  }

  return { boot, wireEvents, applyUserToChrome };
})();
