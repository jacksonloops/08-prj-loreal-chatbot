/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* Conversation history — sent with every request so the AI has full context */
const messages = [];

/* Cloudflare Worker endpoint */
const API_URL = "https://lorealchatbot.jloops.workers.dev/";

/* Render a message in the chat window (instantly, used for user messages) */
function addMessage(role, text) {
  const div = document.createElement("div");
  div.classList.add("msg", role === "user" ? "user" : "ai");
  div.textContent = role === "user" ? `You: ${text}` : `Oré: ${text}`;
  chatWindow.appendChild(div);
  scrollToBottom();
  return div;
}

/* Stream text into a message element word by word */
function streamText(element, fullText, wordsPerTick = 2) {
  return new Promise((resolve) => {
    const words = fullText.split(" ");
    let index = 0;
    element.textContent = "Oré: ";

    const interval = setInterval(() => {
      const chunk = words.slice(index, index + wordsPerTick).join(" ");
      element.textContent += (index > 0 ? " " : "") + chunk;
      index += wordsPerTick;
      scrollToBottom();

      if (index >= words.length) {
        clearInterval(interval);
        resolve();
      }
    }, 45);
  });
}

/* Keep chat scrolled to the latest message */
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show typing indicator while waiting for the API */
function showTyping() {
  const div = document.createElement("div");
  div.classList.add("msg", "ai", "typing-indicator");
  div.innerHTML = "Oré is thinking<span class='dot-pulse'>...</span>";
  chatWindow.appendChild(div);
  scrollToBottom();
  return div;
}

/* Lock / unlock the input area */
function setInputLocked(locked) {
  userInput.disabled = locked;
  document.getElementById("sendBtn").disabled = locked;
  if (!locked) userInput.focus();
}

/* Send messages to Cloudflare Worker and get AI response */
async function sendMessage(userText) {
  /* Add user message to history */
  messages.push({ role: "user", content: userText });

  /* Display user message */
  addMessage("user", userText);

  /* Disable input while waiting */
  setInputLocked(true);

  /* Show typing indicator */
  const typingEl = showTyping();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    /* Add AI response to history */
    messages.push({ role: "assistant", content: aiText });

    /* Remove typing indicator */
    typingEl.remove();

    /* Create the message element, then stream text into it */
    const aiDiv = document.createElement("div");
    aiDiv.classList.add("msg", "ai");
    chatWindow.appendChild(aiDiv);
    await streamText(aiDiv, aiText);
  } catch (error) {
    typingEl.remove();
    addMessage("assistant", "I'm sorry, something went wrong. Please try again.");
    console.error("Chat error:", error);
  } finally {
    setInputLocked(false);
  }
}

/* Set initial greeting */
chatWindow.innerHTML = "";
addMessage("assistant", "Hello! I'm Oré, your personal beauty advisor. Ask me anything about skincare, haircare, makeup, or any L'Oréal brand — I'm here to help.");

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;
  userInput.value = "";
  sendMessage(text);
});
