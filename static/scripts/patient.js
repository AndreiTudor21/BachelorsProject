function showAlert(type, message) {
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  setTimeout(() => {
    const alertEl = alertContainer.querySelector('.alert');
    if (alertEl) {
      bootstrap.Alert.getOrCreateInstance(alertEl).close();
    }
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const formated = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, formated);
}

function formatTime(timeString) {
  const [hour, minute] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hour), parseInt(minute));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function generatePatientAppointmentCard(appointment) {
  const date = formatDate(appointment.date);
  const time = formatTime(appointment.start_time);
  const specialization = appointment.specialization;
  const doctorName = `Dr. ${appointment.doctor_surname} ${appointment.doctor_last_name}`;
  const hasNotes = appointment.notes && appointment.notes.trim() !== '';

  return `
    <div class="container mt-4">
      <div class="row border border-black rounded overflow-hidden" style="background-color: #63A8B7;">
        <div class="col-12 col-md-4 p-3 border-end border-black">
          <p class="mb-1 text-white"><strong>${date}</strong></p>
          <p class="text-white">${specialization} Consultation</p>
        </div>
        <div class="col-12 col-md-4 p-3 border-end border-black">
          <p class="mb-1 text-white"><strong>Time:</strong> ${time}</p>
          <p class="mb-1 text-white"><strong>Location:</strong> THE CLINIC</p>
          <p class="text-white"><strong>Doctor:</strong> ${doctorName}</p>
        </div>
        <div class="col-12 col-md-4 p-3 text-end text-md-center text-lg-end">
          <button class="btn btn-light border border-black see-notes-btn" 
                  ${hasNotes ? '' : 'disabled'} 
                  data-notes="${hasNotes ? appointment.notes.replace(/"/g, '&quot;') : ''}">
            See Consult Notes
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderAppointments(appointments) {
  const sortType = document.getElementById('sort_type').value;
  const sortOrder = document.getElementById('sort_order').value;

  appointments.sort((a, b) => {
    let aVal, bVal;
    if (sortType === 'specialization') {
      aVal = a.specialization.toLowerCase();
      bVal = b.specialization.toLowerCase();
    } else {
      aVal = new Date(a.date + 'T' + a.start_time);
      bVal = new Date(b.date + 'T' + b.start_time);
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const appointmentsHolder = document.getElementById('appointments_holder');
  appointmentsHolder.innerHTML = appointments.map(generatePatientAppointmentCard).join('');

  document.querySelectorAll('.see-notes-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const notes = btn.getAttribute('data-notes');
      const notesField = document.getElementById('notesContent');
      notesField.value = notes || 'No notes available.';
      const modal = new bootstrap.Modal(document.getElementById('notesModal'));
      modal.show();
    });
  });
}

function fetchAndRenderAppointments() {
  fetch('/patient-appointments')
    .then(res => {
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    })
    .then(renderAppointments)
    .catch(err => {
      console.error(err);
      document.getElementById('appointments_holder').innerHTML = `
        <div class="alert alert-danger mt-3">Could not load appointments.</div>
      `;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderAppointments();

  document.getElementById('sort_order').addEventListener('change', fetchAndRenderAppointments);
  document.getElementById('sort_type').addEventListener('change', fetchAndRenderAppointments);

  document.getElementById('appointmentForm').addEventListener('submit', e => {
    e.preventDefault();
    const specialization = document.getElementById('InputSpecialization').value;
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeInput').value;

    fetch('/appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ specialization, date, time })
    })
    .then(res => res.text())
    .then(html => {
      const container = document.getElementById('availableSlotsContainer');
      container.innerHTML = html;

      container.querySelectorAll('.create-appointment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const scheduleId = btn.dataset.scheduleId;
          fetch('/create-appointment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ schedule_id: scheduleId })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              container.innerHTML = '';
              showAlert('success', 'Appointment booked successfully!');
              const modal = bootstrap.Modal.getInstance(document.getElementById('calendarModal'));
              const timer = setTimeout(() => modal.hide(), 2000);
              document.getElementById('calendarModal').addEventListener('click', () => clearTimeout(timer), { once: true });
              fetchAndRenderAppointments();
            } else {
              showAlert('danger', 'Failed: ' + data.error);
            }
          });
        });
      });
    });
  });
});
