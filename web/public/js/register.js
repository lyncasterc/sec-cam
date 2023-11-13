const form = document.querySelector('.register-form');
const generalError = document.querySelector('.general-error-container .error-message');
const usernameError = document.querySelector('.username-error .error-message');
const passwordError = document.querySelector('.password-error .error-message');
const cameraIdError = document.querySelector('.cameraId-error .error-message');
const confirmPasswordError = document.querySelector('.confirm-password-error .error-message');

/**
 * Password requirements:
 * - At least 10 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * - No spaces
 * @param {string} password - Password to validate
 * @returns {boolean}
 */
function isPasswordValid(password) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()\-+])[^\s]{10,128}$/;

  return passwordRegex.test(password);
}

/**
 * Validates user input
 * @param {object} inputs - Object containing user input
 * @param {string} inputs.username - Username
 * @param {string} inputs.cameraId - Camera ID
 * @param {string} inputs.password - Password
 * @param {string} inputs.confirmPassword - Password confirmation
 * @returns {boolean}
 */
function validateInputs({
  username, cameraId, password, confirmPassword,
}) {
  if (!username || !cameraId || !password || !confirmPassword) {
    generalError.textContent = 'Please fill out all fields.';
    generalError.parentElement.classList.add('show');
    return false;
  }

  if (username.length < 3) {
    usernameError.textContent = 'Username must be at least 3 characters.';
    usernameError.parentElement.classList.add('show');
    return false;
  }

  if (password !== confirmPassword) {
    confirmPasswordError.textContent = 'Passwords do not match.';
    confirmPasswordError.parentElement.classList.add('show');
    return false;
  }

  if (!isPasswordValid(password)) {
    passwordError.textContent = 'Password does not meet requirements.';
    passwordError.parentElement.classList.add('show');
    return false;
  }

  return true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = e.target.elements.username.value;
  const cameraId = e.target.elements.cameraId.value;
  const password = e.target.elements.password.value;
  const confirmPassword = e.target.elements.confirmPassword.value;

  // Hide and reset all error messages
  generalError.parentElement.classList.remove('show');
  generalError.textContent = '';

  cameraIdError.parentElement.classList.remove('show');
  cameraIdError.textContent = '';

  usernameError.parentElement.classList.remove('show');
  usernameError.textContent = '';

  passwordError.parentElement.classList.remove('show');
  passwordError.textContent = '';

  confirmPasswordError.parentElement.classList.remove('show');
  confirmPasswordError.textContent = '';

  const isValid = validateInputs({
    username, cameraId, password, confirmPassword,
  });

  if (isValid) {
    try {
      const response = await fetch('/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username, cameraId, password, confirmPassword,
        }),
      });

      if (response.redirected) {
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
            } else if (/cameraid/i.test(error.path)) {
              cameraIdError.textContent = error.msg;
              cameraIdError.parentElement.classList.add('show');
            } else if (/confirm/i.test(error.path)) {
              confirmPasswordError.textContent = error.msg;
              confirmPasswordError.parentElement.classList.add('show');
            } else if (/password/i.test(error.path)) {
              passwordError.textContent = error.msg;
              passwordError.parentElement.classList.add('show');
            }
          });
        }
      }
    } catch (error) {
      generalError.textContent = 'Something went wrong. Please try again later.';
      generalError.parentElement.classList.add('show');
    }
  }
});
