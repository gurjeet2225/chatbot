const chat = document.getElementById('messages');
const form = document.getElementById('userForm');
const input = document.getElementById('userInput');
const bgMusic = document.getElementById('bgMusic');
const langBtn = document.getElementById('langToggle');
const voiceBtn = document.getElementById('voiceToggle');
const musicBtn = document.getElementById('musicToggle');
const micBtn = document.getElementById('micBtn');

let language = 'en';
let voiceOn = true;
let musicPaused = false;

// Voice setup
let selectedVoice = null;
function setupVoices() {
  const voices = speechSynthesis.getVoices();
  selectedVoice = voices.find(v => v.lang.startsWith(language === 'en' ? 'en' : 'hi')) || voices[0];
}
speechSynthesis.onvoiceschanged = setupVoices;

function speak(text) {
  if (!voiceOn) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = selectedVoice;
  utter.lang = language === 'en' ? 'en-IN' : 'hi-IN';
  utter.rate = 1;
  speechSynthesis.speak(utter);
}

function addMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = text;
  msgDiv.appendChild(bubble);
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
}

function botTyping(callback) {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing';
  typingDiv.innerText = 'Bot is typing...';
  chat.appendChild(typingDiv);
  chat.scrollTop = chat.scrollHeight;
  setTimeout(() => {
    typingDiv.remove();
    callback();
  }, 1000 + Math.random() * 1000);
}

function botReply(text) {
  botTyping(() => {
    const lower = text.toLowerCase();
    let reply = '';
    if (/hi|hello/.test(lower)) reply = language === 'en' ? 'Hello! How are you feeling today?' : 'नमस्ते! आज आप कैसा महसूस कर रहे हैं?';
    else if (/sad|upset/.test(lower)) reply = language === 'en' ? 'I’m here for you. Remember, you are not alone 💖' : 'मैं आपके साथ हूँ। याद रखें, आप अकेले नहीं हैं 💖';
    else if (/music/.test(lower)) reply = language === 'en' ? '🎵 Music helps! You can pause or play using the button below.' : '🎵 संगीत मदद करता है! नीचे दिए बटन से संगीत रोकें या चलाएँ।';
    else reply = language === 'en' ? 'Thanks for sharing! You can explore menu options for more help 😊' : 'शेयर करने के लिए धन्यवाद! अधिक मदद के लिए मेन्यू देखें 😊';

    addMessage('bot', reply);
    speak(reply);
  });
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage('user', text);
  input.value = '';
  botReply(text);
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('sendBtn').click();
  }
});

langBtn.onclick = () => {
  language = language === 'en' ? 'hi' : 'en';
  langBtn.textContent = language === 'en' ? '🌐 English' : '🌐 हिंदी';
  addMessage('bot', language === 'en' ? 'Language set to English 🇬🇧' : 'भाषा हिंदी में बदली 🇮🇳');
};

voiceBtn.onclick = () => {
  voiceOn = !voiceOn;
  voiceBtn.textContent = voiceOn ? '🔊 Voice ON' : '🔇 Voice OFF';
  addMessage('bot', voiceOn ? 'Voice enabled.' : 'Voice muted.');
};

musicBtn.onclick = () => {
  if (musicPaused) {
    bgMusic.play();
    musicBtn.textContent = '🎵 Pause Music';
  } else {
    bgMusic.pause();
    musicBtn.textContent = '🎵 Play Music';
  }
  musicPaused = !musicPaused;
};

let recognition;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = e => {
    const transcript = e.results[0][0].transcript;
    addMessage('user', transcript);
    botReply(transcript);
  };
}
micBtn.onclick = () => {
  if (recognition) recognition.start();
  else addMessage('bot', '🎤 Voice input not supported on this device.');
};

window.onload = () => {
  setupVoices();
  bgMusic.volume = 0.1;
  const greet = '👋 Hello! I’m Brave Buddy, your anti-bullying friend. Type or speak to start!';
  addMessage('bot', greet);
  speak(greet);
};