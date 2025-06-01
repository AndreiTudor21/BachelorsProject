window.onload = function () {
    const email = document.getElementById("InputEmail");
    const name = document.getElementById("InputName");
    const password1 = document.getElementById("InputPassword1");
    const password2 = document.getElementById("InputPassword2");
    const form = document.getElementById("loginform");


    form.addEventListener("submit", function (event) {
        if(email.value=="" || name.value == "" || password1.value =="" || password2.value == ""){
            event.preventDefault();
            showEmptyFieldAlert();
        }
        else if (password1.value !== password2.value) {
            event.preventDefault();
            showPasswordMismatchAlert();
        }
    });

    function showEmptyFieldAlert(){
        if(document.getElementById("emptyFieldAlert")) return;
        const alertDiv = document.createElement("div");
        alertDiv.id="emptyFieldAlert";
        alertDiv.className = "alert alert-danger mt-3";
        alertDiv.role = "alert";
        alertDiv.innerText = "All fields must be filled!";
        form.appendChild(alertDiv);

        setTimeout(() => alertDiv.remove(), 4000);
    }


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
    const clear2=document.getElementById("clearInputFullname");
    clear2.addEventListener("click", function(){
        name.value = "";
    });
    const clear3=document.getElementById("clearInputPassword1");
    clear3.addEventListener("click", function(){
        password1.value = "";
    });
    const clear4=document.getElementById("clearInputPassword2");
    clear4.addEventListener("click", function(){
        password2.value = "";
    });
};
