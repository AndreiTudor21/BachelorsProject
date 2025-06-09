document.addEventListener("DOMContentLoaded", function (){
    const userType = document.getElementById('InputType');
    const specGroup = document.getElementById('specialization-group');
    const specInput = document.getElementById('InputSpecialization');

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
});
