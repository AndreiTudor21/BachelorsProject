window.onload = function () {
  const email = document.getElementById("InputEmail");
  const surname = document.getElementById("InputSurname");
  const last_name = document.getElementById("InputLast_Name");
  const password1 = document.getElementById("InputPassword1");
  const password2 = document.getElementById("InputPassword2");
  const form = document.getElementById("registerForm");


  //Shared
  const clearMap = {
    clearInputEmail: email,
    clearInputSurname: surname,
    clearInputLast_Name: last_name,
    clearInputPassword1: password1,
    clearInputPassword2: password2
  };
  for (const [id, field] of Object.entries(clearMap)) {
    const btn = document.getElementById(id);
    if (btn && field) {
      btn.addEventListener("click", () => field.value = "");
    }
  }

  form.addEventListener("submit", function (event) {
    if (password1.value !== password2.value) {
      event.preventDefault();
      showPasswordMismatchAlert();
    }
  });

  function showPasswordMismatchAlert() {
    if (document.getElementById("passwordAlert")) return;

    const alertDiv = document.createElement("div");
    alertDiv.id = "passwordAlert";
    alertDiv.className = "alert alert-danger mt-3";
    alertDiv.role = "alert";
    alertDiv.innerText = "Passwords must match!";
    form.appendChild(alertDiv);

    setTimeout(() => alertDiv.remove(), 4000);
  }

  //Register
  if (window.location.pathname.endsWith("Register.html")) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const formData = new FormData(this);
      const alertContainer = document.getElementById('register-alert-container');

      fetch('/submit', {
        method: 'POST',
        body: new URLSearchParams(formData)
      })
        .then(res => res.text())
        .then(html => {
          if (alertContainer) {
            alertContainer.innerHTML = html;

            const alertEl = alertContainer.querySelector('.alert');
            if (alertEl) {
              alertEl.classList.add('fade', 'show');
              setTimeout(() => {
                alertEl.classList.remove('show');
                setTimeout(() => alertEl.remove(), 200);
              }, 3000);

              if (html.includes('alert-success')) {
                setTimeout(() => {
                  window.location.href = '/LogIn.html';
                }, 2000);
              }
            }
          } else {
            console.error("Missing #register-alert-container");
          }
        })
        .catch(() => {
          if (alertContainer) {
            alertContainer.innerHTML = `
              <div class="alert alert-danger alert-dismissible fade show" role="alert">
                Network error. Please try again.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>
            `;
          }
        });
    });
  }

  //Admin
  if (window.location.pathname.endsWith("Admin.html")) {
    const userType = document.getElementById('InputType');
    const specGroup = document.getElementById('specialization-group');
    const specInput = document.getElementById('InputSpecialization');

    if (userType && specGroup && specInput) {
      userType.addEventListener('change', () => {
        if (userType.value.toLowerCase() === 'doctor') {
          specGroup.style.display = 'block';
          specInput.disabled = false;
        } else {
          specGroup.style.display = 'none';
          specInput.disabled = true;
          specInput.value = '';
        }
      });
    }
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(form);
        const alertContainer = document.getElementById('admin-alert-container');

        fetch('/admin-create', {
        method: 'POST',
        body: new URLSearchParams(formData)
        })
        .then(res => res.text())
        .then(html => {
            if (alertContainer) {
            alertContainer.innerHTML = html;

            const alertEl = alertContainer.querySelector('.alert');
            if (alertEl) {
                alertEl.classList.add('fade', 'show');
                setTimeout(() => {
                alertEl.classList.remove('show');
                setTimeout(() => alertEl.remove(), 150);
                }, 3000);
            }
            }
        })
        .catch(err => {
            console.error('Admin create error:', err);
            alertContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                Network error. Please try again.
            </div>
            `;
        });
    });
    }
};
