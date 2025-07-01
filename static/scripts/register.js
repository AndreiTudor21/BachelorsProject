window.onload = function () {
    const email = document.getElementById("InputEmail");
    const surname = document.getElementById("InputSurname");
    const last_name = document.getElementById("InputLast_Name");
    const password1 = document.getElementById("InputPassword1");
    const password2 = document.getElementById("InputPassword2");
    const form = document.getElementById("loginform");


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

    const clear1=document.getElementById("clearInputEmail");
    clear1.addEventListener("click", function(){
        email.value = "";
    });
    const clear2=document.getElementById("clearInputSurname");
    clear2.addEventListener("click", function(){
        surname.value = "";
    });
    const clear3=document.getElementById("clearInputLast_Name");
    clear3.addEventListener("click", function(){
        last_name.value = "";
    });
    const clear4=document.getElementById("clearInputPassword1");
    clear4.addEventListener("click", function(){
        password1.value = "";
    });
    const clear5=document.getElementById("clearInputPassword2");
    clear5.addEventListener("click", function(){
        password2.value = "";
    });
};
