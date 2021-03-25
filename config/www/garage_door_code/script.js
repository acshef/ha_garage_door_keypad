const displayField = document.getElementById("display")
const digitButtons = Array.from(document.body.querySelectorAll(".digit"))
const deleteButton = document.getElementById("del")
const submitButton = document.getElementById("submit")
const MAX_LENGTH = 10 // digits, should align with input_text in Home Assistant
const params = new URLSearchParams(location.search)
const WEBHOOK_ID = params.get("webhook_id")
const COOLDOWN = 5000 // milliseconds, should align with cooldown timer in Home Assistant

if (!WEBHOOK_ID) {
	const errorMessage = 'URL is missing "webhook_id" parameter'
	document.body.className += " disabled"
	alert(errorMessage)
	throw new Error(errorMessage) // Halt main thread
}

document.body.addEventListener("click", e => {
	if (!e.target.classList.contains("digit")) {
		return
	}
	displayField.value = displayField.value + e.target.innerText
	vibrate(100)

	if (displayField.value.length >= MAX_LENGTH) {
		digitButtons.forEach(digit => (digit.disabled = true))
	}
	deleteButton.disabled = false
	submitButton.disabled = false
	submitButton.innerText = "Enter"
})

deleteButton.addEventListener("click", () => {
	displayField.value = displayField.value.substring(0, displayField.value.length - 1)
	digitButtons.forEach(digit => (digit.disabled = false))
	vibrate(100)
	if (displayField.value.length <= 0) {
		deleteButton.disabled = true
		submitButton.disabled = true
	}
	submitButton.innerText = "Enter"
})
let clearTimeoutID = undefined
deleteButton.addEventListener("pointerdown", () => {
	clearTimeout(clearTimeoutID)
	clearTimeoutID = setTimeout(() => {
		submitButton.disabled = true
		digitButtons.forEach(digit => (digit.disabled = true))
		deleteButton.disabled = true
		submitButton.innerText = "Enter"
		vibrate(displayField.value.length * 25)
		const deleteDigitsIntervalID = setInterval(() => {
			if (displayField.value.length) {
				displayField.value = displayField.value.substring(0, displayField.value.length - 1)
			} else {
				clearInterval(deleteDigitsIntervalID)
				digitButtons.forEach(digit => (digit.disabled = false))
			}
		}, 25)
	}, 750)
})
deleteButton.addEventListener("pointerup", () => {
	clearTimeout(clearTimeoutID)
})

submitButton.addEventListener("click", () => {
	const code = displayField.value.trim()
	if (!code.length) {
		return
	}
	vibrate(100)
	submitButton.disabled = true
	deleteButton.disabled = true
	digitButtons.forEach(digit => (digit.disabled = true))

	submitButton.innerHTML = "<div class='spinner'></div>"

	const promise = fetch(`/api/webhook/${WEBHOOK_ID}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ code: code }),
	})

	promise
		.then(resp => {
			if (!resp.ok) {
				throw new Error("Bad network request")
			}
			const deleteDigitsIntervalID = setInterval(() => {
				if (displayField.value.length) {
					displayField.value = displayField.value.substring(
						0,
						displayField.value.length - 1
					)
				} else {
					clearInterval(deleteDigitsIntervalID)
					setTimeout(() => {
						digitButtons.forEach(digit => (digit.disabled = false))
						submitButton.innerText = "Enter"
					}, COOLDOWN)
				}
			}, 50)
		})
		.catch(() => {
			setTimeout(() => {
				deleteButton.disabled = false
				if (code.length < MAX_LENGTH) {
					digitButtons.forEach(digit => (digit.disabled = false))
				}
				submitButton.disabled = false
				submitButton.innerText = "Retry"
				shake(submitButton)
			}, COOLDOWN)
		})
})

function shake(element) {
	element.classList.add("shake")
	setTimeout(() => {
		element.classList.remove("shake")
	}, 500)
}

function vibrate(duration) {
	try {
		navigator.vibrate(duration)
	} catch (ex) {
		// Silently fail
	}
}
