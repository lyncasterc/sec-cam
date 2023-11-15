const generalError = document.querySelector('.general-error-container .error-message');
const loginForm = document.querySelector('.login-form');
const usernameError = document.querySelector('.username-error .error-message');
const passwordError = document.querySelector('.password-error .error-message');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = e.target.elements.username.value;
  const password = e.target.elements.password.value;

  generalError.parentElement.classList.remove('show');
  generalError.textContent = '';
  usernameError.parentElement.classList.remove('show');
  usernameError.textContent = '';
  passwordError.parentElement.classList.remove('show');
  passwordError.textContent = '';

  if (!username) {
    usernameError.textContent = 'Please enter your username.';
    usernameError.parentElement.classList.add('show');
  } else if (!password) {
    passwordError.textContent = 'Please enter your password.';
    passwordError.parentElement.classList.add('show');
  } else {
    try {
      const response = await fetch('/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok && response.redirected) {
        window.location.href = response.url;
      } else {
        const data = await response.json();

        if (data.error) {
          generalError.textContent = data.error;
          generalError.parentElement.classList.add('show');
        } else if (data.errors) {
          data.errors.forEach((error) => {
            if (/username/i.test(error.path)) {
              usernameError.textContent = error.msg;
              usernameError.parentElement.classList.add('show');
            } else if (/password/i.test(error.path)) {
              passwordError.textContent = error.msg;
              passwordError.parentElement.classList.add('show');
            }
          });
        }
      }
    } catch (error) {
      generalError.textContent = 'suck nots bitch';
      generalError.parentElement.classList.add('show');
    }
  }
});
