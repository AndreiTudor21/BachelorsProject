window.onload = function(){
    const email = document.getElementById("InputEmail");
    const password = document.getElementById("InputPassword");
    const form = document.getElementById("loginform");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (email.value === "" || password.value === "") {
            showEmptyFieldAlert();
        } else {
            // Manual redirect, ONLY if validation passes
            window.location.href = "./Pacient.html";
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

    const clear1=document.getElementById("clearInputEmail");
    clear1.addEventListener("click", function(){
        email.value = "";
    });
    const clear2=document.getElementById("clearInputPassword");
    clear2.addEventListener("click", function(){
        password.value = "";
    });
    console.log("merge");
};