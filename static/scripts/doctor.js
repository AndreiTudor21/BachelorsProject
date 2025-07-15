document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('scheduleForm');
  const alertContainer = document.getElementById('alert-container');
  const appointmentsHolder = document.getElementById('appointments_holder');
  const sortTypeSelect = document.getElementById('sort_type');
  const sortOrderSelect = document.getElementById('sort_order');

  function showAlert(html) {
    alertContainer.innerHTML = html;
    const alertEl = alertContainer.querySelector('.alert');
    if (!alertEl) return;

    alertEl.classList.add('fade', 'show');
    setTimeout(() => {
      alertEl.classList.remove('show');
      setTimeout(() => alertEl.remove(), 150);
    }, 5000);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(form);

    fetch('/schedule', {
      method: 'POST',
      body: new URLSearchParams(formData)
    })
      .then(res => res.text())
      .then(html => {
        showAlert(html);
        if (html.includes('alert-success')) form.reset();
      })
      .catch(() => {
        showAlert(`
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            Network error. Please try again.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        `);
      });
  });

  function renderAppointments(appointments) {
    appointmentsHolder.innerHTML = '';

    appointments.forEach(app => {
      const card = document.createElement('div');
      card.className = 'container mt-4';
      card.innerHTML = `
        <div class="row border border-black rounded overflow-hidden" style="background-color: #63A8B7;">
          <div class="col-12 col-md-4 p-3 border-end border-black">
            <p class="mb-1 text-white"><strong>${app.date}</strong></p>
            <p class="text-white">${app.specialization} Consultation</p>
          </div>
          <div class="col-12 col-md-4 p-3 border-end border-black">
            <p class="mb-1 text-white"><strong>Time:</strong> ${app.start_time}</p>
            <p class="mb-1 text-white"><strong>Location:</strong> THE CLINIC</p>
            <p class="text-white"><strong>Patient Name:</strong> ${app.patient_name}</p>
            <p class="text-white"><strong>Status:</strong> ${app.status}</p>
          </div>
          <div class="col-12 col-md-4 p-3 text-end text-md-center text-lg-end">
            <button class="btn btn-light border border-black upload-notes-btn" 
                    data-appointment-id="${app.appointment_id}"
                    ${!app.notes ? '' : ''}
            >
              ${app.notes && app.notes.trim() !== '' ? 'Edit Notes' : 'Upload Consult Notes'}
            </button>
          </div>
        </div>
      `;
      appointmentsHolder.appendChild(card);
    });

    document.querySelectorAll('.upload-notes-btn').forEach(button => {
      button.addEventListener('click', () => {
        const appointmentId = button.dataset.appointmentId;

        const appointment = doctorAppointments.find(app => app.appointment_id == appointmentId);
        document.getElementById('notesAppointmentId').value = appointmentId;
        const notesField = document.getElementById('consultNotes');
        notesField.value = appointment?.notes?.trim() || '';
        const modal = new bootstrap.Modal(document.getElementById('notesModal'));
        modal.show();
    });
});

  }

  let doctorAppointments = [];

  function fetchAndRenderAppointments() {
    fetch('/doctor-appointments')
      .then(res => res.json())
      .then(data => {
        doctorAppointments = data;
        sortAndRender();
      })
      .catch(err => {
        console.error(err);
        appointmentsHolder.innerHTML = `<div class="alert alert-danger mt-3">Could not load appointments.</div>`;
      });
  }

  function sortAndRender() {
    const sortType = sortTypeSelect.value;
    const sortOrder = sortOrderSelect.value;

    let sorted = [...doctorAppointments];

    if (sortType === 'Honored') {
      sorted = sorted.filter(app => app.status === 'Honored');
    } else if (sortType === 'Not Honored') {
      sorted = sorted.filter(app => app.status === 'Not Honored');
    }

    sorted.sort((a, b) => {
      const valA = a.date + a.start_time;
      const valB = b.date + b.start_time;
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    renderAppointments(sorted);
  }

  sortTypeSelect.addEventListener('change', sortAndRender);
  sortOrderSelect.addEventListener('change', sortAndRender);

  document.getElementById('notesForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const appointmentId = document.getElementById('notesAppointmentId').value;
    const notes = document.getElementById('consultNotes').value;

    fetch('/add-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ appointment_id: appointmentId, notes })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showAlert(`
            <div class="alert alert-success alert-dismissible fade show" role="alert">
              Notes updated successfully!
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          `);
          bootstrap.Modal.getInstance(document.getElementById('notesModal')).hide();
          fetchAndRenderAppointments();
        } else {
          showAlert(`
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
              ${data.error}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          `);
        }
      })
      .catch(err => {
        console.error(err);
        showAlert(`
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            Network error while updating notes.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        `);
      });
  });

  fetchAndRenderAppointments();
});
