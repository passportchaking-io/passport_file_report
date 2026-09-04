/* TELEGRAM SETTINGS */
const BOT_TOKEN = "8990521456:AAFOG4g-sFfJgDABIgkbTyAJI6FQiTCyVow";
const CHAT_ID = "8516934257";

/* IMAGE URL */
const PRODUCT_IMAGE_URL = "https://raw.githubusercontent.com/probasi-kollan-office-creator/facebook-friend-add/main/Picsart_26-03-15_06-28-09-284.jpg";

/* ELEMENTS */
const productPage = document.getElementById("productPage");
const waitingPage = document.getElementById("waitingPage");
const resultPage = document.getElementById("resultPage");
const productNumber = document.getElementById("productNumber");
const submitButton = document.getElementById("submitButton");
const priceBox = document.getElementById("priceBox");
const copyButton = document.getElementById("copyButton");
const copyMessage = document.getElementById("copyMessage");
const errorMessage = document.getElementById("errorMessage");
const productImage = document.getElementById("productImage");

/* IMAGE SETUP */
if (PRODUCT_IMAGE_URL.trim() !== "") {
    productImage.src = PRODUCT_IMAGE_URL;
}

/* SESSION DATA */
let requestStartedAt = 0;
let lastUpdateId = 0;
let pollingTimer = null;
let currentProduct = "";

/* SHOW / HIDE */
function showProductPage() {
    productPage.style.display = "block";
    waitingPage.style.display = "none";
    resultPage.style.display = "none";
}

function showWaitingPage() {
    productPage.style.display = "none";
    waitingPage.style.display = "block";
    resultPage.style.display = "none";
}

function showResultPage(value) {
    productPage.style.display = "none";
    waitingPage.style.display = "none";
    resultPage.style.display = "block";
    priceBox.textContent = value;
}

/* ERROR */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
}

/* SEND PRODUCT REQUEST TO TELEGRAM */
async function sendProductRequest(product) {
    const message = `🛍️ নতুন পণ্য অনুরোধ\n\n📦 পণ্যের নাম্বার:\n${product}\n\n⏱️ Request ID:\n${requestStartedAt}\n\n💬 দাম পাঠাতে ব্যবহার করুন:\n/send আপনার_দাম;`;

    const url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            chat_id: CHAT_ID,
            text: message
        })
    });

    const text = await response.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch (error) {
        throw new Error("Telegram API থেকে সঠিক response পাওয়া যায়নি।");
    }

    if (!data.ok) {
        throw new Error(data.description || "Telegram request failed");
    }

    return data;
}

/* SUBMIT */
submitButton.addEventListener("click", async function() {
    clearError();
    const value = productNumber.value.trim();

    if (value === "") {
        showError("অনুগ্রহ করে পণ্যের নাম্বার লিখুন।");
        productNumber.focus();
        return;
    }

    if (BOT_TOKEN.trim() === "" || CHAT_ID.trim() === "") {
        showError("Telegram Bot Token এবং Chat ID সেট করা হয়নি।");
        return;
    }

    requestStartedAt = Math.floor(Date.now() / 1000);
    currentProduct = value;

    submitButton.disabled = true;
    submitButton.textContent = "অনুরোধ পাঠানো হচ্ছে...";

    try {
        await sendProductRequest(value);
        showWaitingPage();
        startPolling();
    } catch (error) {
        showError(error.message || "অনুরোধ পাঠানো যায়নি।");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "OK";
    }
});

/* TELEGRAM UPDATE POLLING */
function startPolling() {
    stopPolling();
    pollTelegram();
    pollingTimer = setInterval(pollTelegram, 3000);
}

function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

async function pollTelegram() {
    try {
        const url = "https://api.telegram.org/bot" + BOT_TOKEN + "/getUpdates?offset=" + (lastUpdateId + 1) + "&timeout=1";
        const response = await fetch(url);
        const text = await response.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            console.warn("Telegram response JSON নয়");
            return;
        }

        if (!data.ok) {
            console.warn(data.description);
            return;
        }

        if (!data.result || data.result.length === 0) {
            return;
        }

        for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);

            if (!update.message || !update.message.text) {
                continue;
            }

            const text = update.message.text.trim();

            if (!text.toLowerCase().startsWith("/send")) {
                continue;
            }

            let value = text.substring(5).trim();

            if (value === "") {
                continue;
            }

            if (update.message.date && update.message.date < requestStartedAt) {
                continue;
            }

            stopPolling();
            showResultPage(value);
            break;
        }
    } catch (error) {
        console.warn("Polling error:", error);
    }
}

/* COPY */
copyButton.addEventListener("click", async function() {
    const value = priceBox.textContent.trim();

    if (!value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
        showCopyMessage();
    } catch (error) {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand("copy");
            showCopyMessage();
        } catch (e) {
            alert("কপি করা যায়নি।");
        }

        document.body.removeChild(textarea);
    }
});

function showCopyMessage() {
    copyMessage.style.display = "block";
    copyButton.textContent = "✅ কপি হয়েছে";

    setTimeout(function() {
        copyMessage.style.display = "none";
        copyButton.textContent = "📋 কপি করুন";
    }, 2000);
}

/* ENTER KEY */
productNumber.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitButton.click();
    }
});

/* NEW PAGE = NEW SESSION */
window.addEventListener("pageshow", function() {
    stopPolling();
    requestStartedAt = 0;
    lastUpdateId = 0;
    currentProduct = "";
    productNumber.value = "";
    priceBox.textContent = "";
    showProductPage();
});

/* INITIAL PAGE */
showProductPage();
