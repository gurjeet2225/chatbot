\
/* script.js - improved and cleaned from original files
   - preserves major features: voice, mic, quiz, pledge, calm mode, report, location, WA share
   - uses inline SVG mascot and WebAudio for simple sounds so project works without external images/audio
*/

// Elements
const chat = document.getElementById('chat');
const composer = document.getElementById('composer');
const input = document.getElementById('input');
const langToggle = document.getElementById('langToggle');
const voiceBtn = document.getElementById('voiceBtn');
const voiceSelect = document.getElementById('voiceSelect');
const musicToggle = document.getElementById('musicToggle');
const micBtn = document.getElementById('micBtn');
const mascot = document.getElementById('mascot');

// State
let language = 'en'; // 'hi' for Hindi
let voiceEnabled = true;
let bgPlaying = true;
let audioCtx, bgGain, bgOsc;
let selectedVoiceName = null;

// Initialize on load
window.addEventListener('load', () => {
  safeInitAudio();
  populateVoices();
  showIntro();
});

/* ------------------ Audio (background & sfx) ------------------ */
function safeInitAudio(){
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    bgGain = audioCtx.createGain();
    bgGain.gain.value = 0.03; // very soft
    bgGain.connect(audioCtx.destination);

    // simple mellow background using two oscillators (sine + triangle) detuned
    bgOsc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    bgOsc.type = 'sine'; bgOsc.frequency.value = 220;
    osc2.type = 'triangle'; osc2.frequency.value = 110;
    const mix = audioCtx.createGain(); mix.gain.value = 0.5;
    bgOsc.connect(mix); osc2.connect(mix); mix.connect(bgGain);
    bgOsc.start(); osc2.start();
    // fade in slowly when user interacts
    document.addEventListener('click', () => resumeBackground(), { once: true });
  } catch(e){
    console.warn('Audio init failed:', e);
    audioCtx = null;
  }
}

function resumeBackground(){
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  bgGain.gain.value = 0.03;
  bgPlaying = true;
  musicToggle.textContent = '🎵 Pause Music';
}

function toggleBackground(){
  if (!audioCtx) { addBot('⚠️ Background audio not supported'); return; }
  if (bgPlaying){
    bgGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    musicToggle.textContent = '🎵 Play Music';
  } else {
    bgGain.gain.setTargetAtTime(0.03, audioCtx.currentTime, 0.05);
    musicToggle.textContent = '🎵 Pause Music';
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }
  bgPlaying = !bgPlaying;
}
musicToggle.addEventListener('click', toggleBackground);

/* ------------------ Simple SFX (click/clap/siren) ------------------ */
function playClick(){
  if (!audioCtx) return;
  const g = audioCtx.createGain(); g.gain.value = 0.12;
  const o = audioCtx.createOscillator(); o.type='square'; o.frequency.value=880;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); setTimeout(()=>{ o.stop(); }, 80);
}
function playClap(){
  if (!audioCtx) return;
  const g = audioCtx.createGain(); g.gain.value = 0.08;
  const o = audioCtx.createOscillator(); o.type='sawtooth'; o.frequency.value=440;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); setTimeout(()=>{ o.stop(); }, 140);
}
function playSiren(duration=2500){
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = 600;
  o.connect(g); g.connect(audioCtx.destination);
  g.gain.value = 0.05;
  o.start();
  const start = audioCtx.currentTime;
  // sweep down for 2.5s
  o.frequency.linearRampToValueAtTime(200, start + duration/1000);
  setTimeout(()=>{ o.stop(); }, duration);
}

/* ------------------ Speech Synthesis ------------------ */
function populateVoices(){
  const voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = '';
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name; opt.textContent = v.name + ' ('+v.lang+')';
    voiceSelect.appendChild(opt);
  });
  const prefer = voices.find(v => /en-?in|prabhat|kumar|nirmal/i.test(v.name+' '+v.lang));
  if (prefer) {
    selectedVoiceName = prefer.name;
    voiceSelect.value = selectedVoiceName;
  } else if (voices[0]) {
    selectedVoiceName = voices[0].name;
    voiceSelect.value = selectedVoiceName;
  }
}
speechSynthesis.onvoiceschanged = populateVoices;
voiceSelect.addEventListener('change', (e)=> selectedVoiceName = e.target.value);

function speak(text, opts={}){
  if (!voiceEnabled) return;
  try {
    const cleaned = String(text).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
    if (!cleaned) return;
    const u = new SpeechSynthesisUtterance(cleaned);
    if (selectedVoiceName) {
      const v = speechSynthesis.getVoices().find(x=>x.name===selectedVoiceName);
      if (v) u.voice = v;
    }
    u.lang = (language === 'en') ? 'en-IN' : 'hi-IN';
    u.rate = opts.rate || 1;
    u.pitch = opts.pitch || 1;
    speechSynthesis.speak(u);
  } catch(e){
    console.warn('speak error', e);
  }
}
voiceBtn.addEventListener('click', ()=>{
  voiceEnabled = !voiceEnabled;
  voiceBtn.textContent = voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF';
  addBot(voiceEnabled ? (language==='en'?'Voice enabled.':'वॉइस चालू') : (language==='en'?'Voice muted.':'वॉइस बंद'));
});

/* ------------------ Simple UI helpers ------------------ */
function addUser(text){
  const div = document.createElement('div'); div.className='msg user';
  const b = document.createElement('div'); b.className='bubble'; b.innerHTML = escapeHtml(text);
  div.appendChild(b); chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
}
function addBot(text, silent=false){
  const div = document.createElement('div'); div.className='msg bot';
  const b = document.createElement('div'); b.className='bubble'; b.innerHTML = text;
  div.appendChild(b); chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
  if (!silent) speak(text);
}
function showTyping(cb){
  const t = document.createElement('div'); t.className='typing'; t.textContent='Bot is typing...';
  chat.appendChild(t); chat.scrollTop = chat.scrollHeight;
  setTimeout(()=>{ t.remove(); cb(); }, 700 + Math.random()*900);
}
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ------------------ Core conversation logic ------------------ */
const texts = {
  en: {
    intro: '👋 Hi! I am Brave Buddy. Tell me your name to start.',
    nice: 'Nice to meet you,',
    bullying: 'Bullying = repeated harm with imbalance of power. I can help.',
    advice: 'Stay calm, save evidence, tell a trusted adult, block/report if online.',
    report: 'Save proof, block/report, tell teacher/parent. For emergencies call 112.',
    role: '🎭 Let us roleplay some situations.',
    quizIntro: '📝 Here is a quick quiz!',
    pledge: 'I pledge to stand against bullying and to spread kindness.'
  },
  hi: {
    intro: '👋 नमस्ते! मैं ब्रेव बडी हूँ। अपना नाम बताइए।',
    nice: 'आपसे मिलकर खुशी हुई,',
    bullying: 'बदमाशी = बार-बार नुकसान जिसमें शक्ति में असंतुलन हो।',
    advice: 'शांत रहें, सबूत रखें, किसी भरोसेमंद बड़े को बताएं।',
    report: 'सबूत रखें, ब्लॉक/रिपोर्ट करें, शिक्षक/माता-पिता को बताएं।',
    role: '🎭 चलिए कुछ स्थिति पर अभ्यास करते हैं।',
    quizIntro: '📝 ये एक छोटा क्विज है!',
    pledge: 'मैं बदमाशी के खिलाफ खड़ा रहूँगा और दया फैलाऊँगा।'
  }
};

let state = {
  awaitingName: true,
  userName: null,
  awaitingRoleplay: false,
  awaitingQuiz: false,
  quizIndex:0, quizScore:0
};

function showIntro(){
  addBot((language==='en')?texts.en.intro:texts.hi.intro);
  speak((language==='en')?texts.en.intro:texts.hi.intro);
}

// Handle user input
composer.addEventListener('submit', e=>{
  e.preventDefault();
  const text = input.value.trim();
  if(!text) return;
  input.value=''; addUser(text); handleUserInput(text);
});

// Enter sends (no newline unless SHIFT+Enter)
input.addEventListener('keydown', e=>{
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); composer.requestSubmit(); }
});

function handleUserInput(text){
  // initial name step
  if(state.awaitingName){
    state.awaitingName=false; state.userName=text;
    showTyping(()=>{
      addBot((language==='en')? (texts.en.nice + ' <b>'+escapeHtml(state.userName)+'</b>!'): (texts.hi.nice + ' <b>'+escapeHtml(state.userName)+'</b>!'));
      showMenu();
    });
    return;
  }

  if(state.awaitingRoleplay){ handleRoleplayResponse(text); return; }
  if(state.awaitingQuiz) return; // quiz uses buttons

  if (/help|bully|bullying|बदमाशी|help me/i.test(text)){
    showTyping(()=>{ addBot((language==='en')?texts.en.bullying:texts.hi.bullying); });
    return;
  }
  if (/hi|hello|hey|namaste/i.test(text)){
    showTyping(()=>{ addBot(language==='en'?'Hello! How can I help?':'नमस्ते! कैसे मदद करूँ?'); });
    return;
  }
  if (/sad|upset|depressed|दुख|उदास/i.test(text)){
    showTyping(()=>{ addBot(language==='en'?'I am sorry you feel that way. Talk to someone you trust.':'मुझे खेद है कि आप ऐसा महसूस कर रहे हैं। किसी भरोसेमंद से बात करें।'); });
    return;
  }

  showTyping(async ()=>{
    try {
      addBot('🔎 Searching...');
      const res = await fetch('https://api.duckduckgo.com/?q='+encodeURIComponent(text)+'&format=json');
      const data = await res.json();
      const ans = data.AbstractText || data.Heading || 'Sorry, I could not find a clear answer.';
      addBot(ans);
    } catch(e){
      addBot('⚠️ Error searching. Try a different query.');
    }
  });
}

/* ------------------ Menu and features ------------------ */
function showMenu(){
  addBot('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">'+
    `<button class="menu-btn" onclick="calmDown()">🧘 Calm</button>`+
    `<button class="menu-btn" onclick="detectBullying()">🤔 Is it bullying?</button>`+
    `<button class="menu-btn" onclick="startRoleplay()">🎭 Practice replies</button>`+
    `<button class="menu-btn" onclick="startQuiz()">📝 Quiz</button>`+
    `<button class="menu-btn" onclick="pledge()">🤝 Pledge</button>`+
    `<button class="menu-btn" onclick="reportForm()">📋 Report form</button>`+
  '</div>', true);
}
window.showMenu = showMenu;

// Calm down
function calmDown(){
  showTyping(()=>{
    addBot((language==='en')?'Let\\'s do a short breathing exercise. Follow me.':'एक छोटा श्वास अभ्यास करते हैं।');
    addBot('🌬️ Inhale — Hold — Exhale\n(Repeat a few times)', true);
    speak((language==='en')?'Breathe in... hold... breathe out...':'श्वास लें... रोके... छोड़ें...');
  });
}
window.calmDown = calmDown;

// Roleplay
const roleplayScenarios = {
  en: [
    "Someone says 'You're not good enough.' What do you reply?",
    "Someone posts a mean comment about you online. How will you respond?",
    "A friend keeps excluding you. What would you do?"
  ],
  hi: [
    'कोई कहता है: \"तुम अच्छे नहीं हो\" तो आप क्या कहेंगे?',
    'ऑनलाइन बुरा कमेंट आता है, आप कैसे जवाब देंगे?',
    'एक दोस्त बार-बार आपको बाहर करता है, आप क्या करेंगे?'
  ]
};
function startRoleplay(){
  const list = roleplayScenarios[language==='en'?'en':'hi'];
  const s = list[Math.floor(Math.random()*list.length)];
  state.awaitingRoleplay = true;
  showTyping(()=>{ addBot('🎭 '+s); addBot('Type your reply and I will give feedback.'); });
}
window.startRoleplay = startRoleplay;
function handleRoleplayResponse(text){
  state.awaitingRoleplay=false;
  let good = /stop|no|that's enough|report|teacher|block|रुके|रोको|रिपोर्ट/i.test(text);
  showTyping(()=>{ addBot(good? (language==='en'?'⭐ Good response!':'अच्छा जवाब!') : (language==='en'?'Try being firm: \"I want this to stop.\"':'दृढ़ता से कहें: \"मुझे यह बंद चाहिए\"')); });
}

// Quiz
const quizQuestions = {
  en:[
    {q:'Which is bullying?', options:['Teasing once','Helping a friend','Repeatedly making fun'], answer:2},
    {q:'What to do if you see bullying?', options:['Ignore','Support and report','Join in'], answer:1}
  ],
  hi:[
    {q:'इनमें से कौन बदमाशी है?', options:['एक बार चिढ़ाना','मदद करना','बार-बार मजाक'], answer:2},
    {q:'बदमाशी देखें तो क्या करें?', options:['अनदेखा','सहयोग और रिपोर्ट','शामिल हो'], answer:1}
  ]
};
function startQuiz(){ state.awaitingQuiz=true; state.quizIndex=0; state.quizScore=0; showQuizQuestion(); }
window.startQuiz = startQuiz;
function showQuizQuestion(){
  const q = quizQuestions[language==='en'?'en':'hi'][state.quizIndex];
  const html = `<div><b>Q${state.quizIndex+1}:</b> ${escapeHtml(q.q)}<br>` +
    q.options.map((o,i)=>`<button class="quiz-opt" data-i="${i}" onclick="answerQuiz(event)">${i+1}. ${o}</button>`).join('<br>') +
    `</div>`;
  showTyping(()=>{ addBot(html); });
}
function answerQuiz(e){
  const btn = e.target; const i = Number(btn.dataset.i);
  const q = quizQuestions[language==='en'?'en':'hi'][state.quizIndex];
  if (i===q.answer){ state.quizScore++; playClap(); addBot('✅ Correct!'); } else { addBot('❌ Wrong. Correct: '+ q.options[q.answer]); }
  state.quizIndex++;
  if(state.quizIndex < quizQuestions[language==='en'?'en':'hi'].length){ setTimeout(showQuizQuestion,700); }
  else { state.awaitingQuiz=false; addBot('🎉 Quiz done! Score: '+state.quizScore); }
}
window.answerQuiz = answerQuiz;

// Pledge
function pledge(){ showTyping(()=>{ const t = (language==='en')?texts.en.pledge:texts.hi.pledge; addBot('<b>Repeat after me:</b> '+escapeHtml(t)); speak(t, {rate:0.95, pitch:1}); }); }
window.pledge = pledge;

// Mascot click
mascot.addEventListener('click', ()=>{
  mascot.animate([{transform:'translateY(0)'},{transform:'translateY(-6px)'},{transform:'translateY(0)'}], {duration:400, iterations:1});
  showTyping(()=>{
    addBot((language==='en')?'Stay away!':'दूर रहें!');
    speak((language==='en')?'Stay away!':'दूर रहें!', {rate:1.0, pitch:0.7});
    playSiren(1800);
  });
});

// Mic (speech recognition)
let recognition;
if('webkitSpeechRecognition' in window){
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false; recognition.interimResults = false;
  recognition.lang = 'en-IN';
  recognition.onresult = (ev)=>{ const t = ev.results[0][0].transcript; addUser(t); handleUserInput(t); };
  recognition.onerror = ()=> addBot('⚠️ Voice input failed.');
} else {
  micBtn.title = 'Speech recognition not supported';
}
micBtn.addEventListener('click', ()=>{
  if (recognition) { recognition.start(); addBot('🎤 Listening...'); }
  else { addBot('🎤 Voice input not available on this browser.'); }
});

// Location helper
function askLocation(){
  if(!navigator.geolocation){ addBot('❌ Location not supported.'); return; }
  showTyping(()=>{ addBot('Trying to detect location — please allow permission.'); });
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
    const map = `https://www.google.com/maps?q=${lat},${lon}`;
    addBot(`✅ Location: ${lat}, ${lon} <br><a href=\"${map}\" target=\"_blank\">Open in Maps</a>`);
  }, ()=> addBot('⚠️ Location permission denied or unavailable.'));
}
window.askLocation = askLocation;

// Simple analysis for bullying keywords
function analyzeBullying(text){
  const lower = text.toLowerCase();
  const physical = ['hit','push','kick','beat','dhakka','गिरा'];
  const verbal = ['insult','stupid','ugly','abuse','mock','gaali','बुरा'];
  const cyber = ['post','comment','online','whatsapp','instagram','facebook'];
  const found = [];
  if (physical.some(w=>lower.includes(w))) found.push('physical');
  if (verbal.some(w=>lower.includes(w))) found.push('verbal');
  if (cyber.some(w=>lower.includes(w))) found.push('cyber');
  if (found.length) addBot('⚠️ Signs detected: '+found.join(', '));
  else addBot('✅ It does not strongly look like bullying, but trust your feelings and stay safe.');
}

// Composer extra: detect multi-line report or sentences that indicate bullying
composer.addEventListener('submit', e=>{
  const txt = input.value.trim();
  if(!txt) return;
  if (txt.split('\\n').length >= 3){
    const lines = txt.split('\\n').map(s=>s.trim());
    const reportText = `Bullying Report:\\nWho: ${lines[0]}\\nWhere: ${lines[1]}\\nWhat: ${lines.slice(2).join(' ')}`;
    addBot('<pre>'+escapeHtml(reportText)+'</pre>');
    const blob = new Blob([reportText], {type:'text/plain'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='Bullying_Report.txt'; a.textContent='⬇️ Download Report'; a.style.display='inline-block'; a.style.marginTop='6px';
    const div = document.createElement('div'); div.appendChild(a); chat.appendChild(div);
    input.value=''; return;
  }
  if (/\b(hit|push|insult|post|comment|bully|बदमाशी|धक्का|मार)\b/i.test(txt)){
    analyzeBullying(txt);
  }
});

// Language toggle
langToggle.addEventListener('click', ()=>{
  language = (language==='en') ? 'hi' : 'en';
  langToggle.textContent = (language==='en') ? '🌐 English' : '🌐 हिंदी';
  addBot(language==='en' ? 'Language set to English' : 'भाषा हिंदी में सेट');
  speak(language==='en' ? 'Language set to English' : 'भाषा हिंदी में सेट');
});

// small resume if audio suspended
document.addEventListener('click', ()=>{ if (audioCtx && bgPlaying && audioCtx.state==='suspended') audioCtx.resume(); }, {once:true});
