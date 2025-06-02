window.onload = function(){
    const email = document.getElementById("InputEmail");
    const password = document.getElementById("InputPassword");
    const form = document.getElementById("loginform");
    const alertPlaceholder = document.getElementById("alert-placeholder");

    const clear1=document.getElementById("clearInputEmail");
    clear1.addEventListener("click", function(){
        email.value = "";
    });
    const clear2=document.getElementById("clearInputPassword");
    clear2.addEventListener("click", function(){
        password.value = "";
    });

    function showAlert(message, type = "danger") {
    alertPlaceholder.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    }


    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        try {
        const response = await fetch("/login", {
            method: "POST",
            body: new URLSearchParams(formData),
        });

        const data = await response.json();

        if (data.error) {
            showAlert(data.error);
        } else if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            showAlert("Unexpected response from server.");
        }
        } catch (error) {
        showAlert("Network or server error. Try again later.");
        console.error(error);
        }
    });
    console.log("merge");
};