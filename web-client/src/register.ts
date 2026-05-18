import "./styles/auth.css";

// bind with event listener
const usernameInput = document.getElementById("username") as HTMLInputElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const confirmPassword = document.getElementById(
    "password-confirm",
) as HTMLInputElement;
const registerButton = document.getElementById(
    "register-btn",
) as HTMLButtonElement;

registerButton.addEventListener("click", async (event) => {
    registerButton.disabled = true; // avoid many times submit
    try {
        event.preventDefault(); // prevent auto refresh
        const username = usernameInput.value;
        const name = nameInput.value;
        const password = passwordInput.value;
        const passwordConfirm = confirmPassword.value;

        // check username and password have value
        if (!username || !password || !passwordConfirm || !name) {
            popup("Please fill in all fields");
            return;
        }
        // check the consistency of passwords
        if (passwordConfirm !== password) {
            popup("Passwords do not match");
            return;
        }
        // make sure the input of username and password are valid
        if (!validateUsername(username)) {
            popup(
                "Username cannot contain special characters and must have length between 4 and 20 characters",
            );
            return;
        }
        if (!validatePassword(password)) {
            popup(
                "Password must contain at least one upper and lower case letter, at least one number, and must be more than 6 characters long",
            );
            return;
        }
        // attempt to fetch api/auth/register
        const response = await fetch("/api/auth/register", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, name, password }),
        });
        // return without 200 status
        if (!response.ok) {
            const { message } = await response.json();
            popup(message);
        } else {
            window.location.href = "/auth/login/index.html?register=successful";
        }
    } catch (error) {
        console.error(error);
    } finally {
        registerButton.disabled = false; // avoid many times submit
    }
});

function popup(text: string) {
    console.error(text);
    const popupText = document.getElementById("popupText");
    popupText!.innerText = text;
    return;
}

function validateUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9._]{4,20}$/; // regex for the username
    return usernameRegex.test(username);
}

function validatePassword(password: string): boolean {
    if (password.length < 6) {
        return false;
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasLowerCase && hasUpperCase && hasNumber;
}
