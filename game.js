// Audio Synthesizer for simple sound effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol=0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
  correct: () => {
    playTone(600, 'sine', 0.1);
    setTimeout(() => playTone(800, 'sine', 0.2), 100);
  },
  wrong: () => {
    playTone(300, 'sawtooth', 0.3);
  },
  click: () => {
    playTone(500, 'square', 0.05, 0.05);
  },
  hint: () => {
    playTone(700, 'sine', 0.1, 0.05);
  },
  finish: () => {
    playTone(400, 'sine', 0.2);
    setTimeout(() => playTone(500, 'sine', 0.2), 200);
    setTimeout(() => playTone(600, 'sine', 0.4), 400);
  }
};

// Game State
let gameState = {
  mode: 'normal', // 'normal' or 'timeAttack'
  gen: 'all',
  score: 0,
  timeLeft: 60,
  timerInterval: null,
  autoAdvanceTimeout: null,
  
  currentPokemon: null,
  currentName: "",
  revealed: false
};

// UI Elements mapping
const screens = {
  menu: document.getElementById('menu-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// Initialization
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('play-again-btn').addEventListener('click', () => {
  sounds.click();
  showScreen('menu');
});

document.getElementById('share-x-btn').addEventListener('click', () => {
  sounds.click();
  
  let modeText = gameState.mode === 'timeAttack' ? 'タイムアタック(ノーマル)' : 'タイムアタック(ハード)';
  const genSelect = document.getElementById('gen-select');
  const genText = genSelect.options[genSelect.selectedIndex].text;
  
  // Extract just the text content from the rank element (ignore the img tag)
  const rankElem = document.getElementById('final-rank');
  const rankText = rankElem.textContent.trim();
  
  const tweetText = `スマホロトム風ポケモンクイズに挑戦したよ！📱⚡️\n\n【${modeText} / ${genText}】\n🏆 ランク：${rankText}\n🎯 正解数：${gameState.score}問\n\n#ポケモンシルエットクイズ #ポケモン図鑑風`;
  
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  window.open(url, '_blank');
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  sounds.click();
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  if (gameState.autoAdvanceTimeout) clearTimeout(gameState.autoAdvanceTimeout);
  showScreen('menu');
});

// Submit Button
document.getElementById('submit-btn').addEventListener('click', checkAnswer);
document.getElementById('next-btn').addEventListener('click', loadNextPokemon);

// Input Suggestions
const answerInput = document.getElementById('answer-input');
const suggestionsBox = document.getElementById('suggestions');

answerInput.addEventListener('input', function() {
  const val = this.value;
  if (!val) {
    suggestionsBox.style.display = "none";
    return;
  }
  const matches = allPokemonNames.filter(n => n.startsWith(val)).slice(0, 5);
  if (matches.length === 0) {
    suggestionsBox.style.display = "none";
    return;
  }
  suggestionsBox.innerHTML = matches.map(n => `<li onclick="selectName('${n}')">${n}</li>`).join("");
  suggestionsBox.style.display = "block";
});

window.selectName = function(name) {
  answerInput.value = name;
  suggestionsBox.style.display = "none";
};

// Game Logic
function startGame() {
  sounds.click();
  gameState.mode = document.getElementById('mode-select').value;
  gameState.gen = document.getElementById('gen-select').value;
  gameState.score = 0;
  gameState.timeLeft = 60;
  
  answerInput.value = "";
  suggestionsBox.style.display = "none";
  
  document.getElementById('score-display').textContent = `正解数: 0`;
  
  if (gameState.mode.startsWith('timeAttack')) {
    document.getElementById('score-display').style.display = 'block';
    document.getElementById('timer-display').style.display = 'flex';
    document.getElementById('timer-display').innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png" style="width:20px; height:20px; margin-right:4px;"> 60秒`;
    gameState.timerInterval = setInterval(updateTimer, 1000);
  } else {
    document.getElementById('score-display').style.display = 'block';
    document.getElementById('timer-display').style.display = 'none';
  }
  
  showScreen('game');
  loadNextPokemon();
}

function updateTimer() {
  gameState.timeLeft--;
  document.getElementById('timer-display').innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png" style="width:20px; height:20px; margin-right:4px;"> ${gameState.timeLeft}秒`;
  if (gameState.timeLeft <= 0) {
    endGame();
  }
}

function endGame() {
  clearInterval(gameState.timerInterval);
  if (gameState.autoAdvanceTimeout) clearTimeout(gameState.autoAdvanceTimeout);
  sounds.finish();
  
  let rankText = "モンスターボール級";
  let rankImg = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
  
  if (gameState.score >= 10) {
    rankText = "マスターボール級";
    rankImg = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png";
  } else if (gameState.score >= 7) {
    rankText = "ハイパーボール級";
    rankImg = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png";
  } else if (gameState.score >= 5) {
    rankText = "スーパーボール級";
    rankImg = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png";
  }
  
  showScreen('result');
  document.getElementById('final-rank').innerHTML = `<img src="${rankImg}" style="width: 40px; vertical-align: middle; margin-right: 4px;"> ${rankText}`;
  document.getElementById('final-score').textContent = `正解数: ${gameState.score}`;
}

function loadNextPokemon() {
  sounds.click();
  gameState.revealed = false;
  gameState.hintsUsed = { type: false, region: false };
  
  // UI Reset
  const img = document.getElementById('pokemon-img');
  img.src = "";
  img.className = "silhouette";
  
  answerInput.value = "";
  suggestionsBox.style.display = "none";
  answerInput.disabled = false;
  document.getElementById('submit-btn').style.display = 'block';
  document.getElementById('next-btn').style.display = 'none';
  document.getElementById('message-box').textContent = "だーれだ？";
  document.getElementById('message-box').style.color = "#fff";
  
  document.getElementById('number-display').textContent = "";
  document.getElementById('genus-display').textContent = "";
  document.getElementById('region-display').textContent = "";
  document.getElementById('type-display').innerHTML = "";
  document.getElementById('desc-display').textContent = "";
  
  if (gameState.mode.includes('hard')) {
    img.style.opacity = '0';
    document.getElementById('hard-mode-question').style.display = 'block';
  } else {
    img.style.opacity = '1';
    document.getElementById('hard-mode-question').style.display = 'none';
  }
  
  // Choose ID based on generation
  const range = genRanges[gameState.gen];
  const id = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  
  document.getElementById('message-box').textContent = "データ受信中...";
  
  // Fetch from PokeAPI
  Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json()),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(r => r.json())
  ]).then(([pokeData, speciesData]) => {
    
    // Save current pokemon data
    const jaName = speciesData.names.find(n => n.language.name === "ja") || speciesData.names.find(n => n.language.name === "ja-hrkt");
    const name = jaName ? jaName.name : "???";
    
    const jaGenus = speciesData.genera.find(g => g.language.name === "ja") || speciesData.genera.find(g => g.language.name === "ja-hrkt");
    const genus = jaGenus ? jaGenus.genus : "???ポケモン";
    
    let region = hisuiOverride.includes(id) ? "ヒスイ地方" : (regionMap[speciesData.generation?.name] || "不明");
    
    const jaDesc = speciesData.flavor_text_entries.find(f => f.language.name === "ja") || speciesData.flavor_text_entries.find(f => f.language.name === "ja-hrkt");
    const descText = jaDesc ? jaDesc.flavor_text : (customDesc[id] || "（このポケモンの図鑑データは まだ見つかっていないようだ…）");
    
    let typeHtml = "";
    pokeData.types.forEach(t => {
      const tName = t.type.name;
      const tColor = typeColors[tName] || "#888";
      const tJa = typeNames[tName] || tName;
      typeHtml += `<span class="type-badge" style="background-color: ${tColor}">${tJa}</span>`;
    });

    gameState.currentPokemon = {
      id: id,
      name: name,
      image: pokeData.sprites.front_default,
      types: typeHtml,
      region: region,
      desc: descText,
      genus: genus
    };
    
    img.src = gameState.currentPokemon.image;
    document.getElementById('number-display').textContent = `No.${String(gameState.currentPokemon.id).padStart(4, '0')}`;
    document.getElementById('genus-display').textContent = gameState.currentPokemon.genus;
    document.getElementById('region-display').textContent = gameState.currentPokemon.region;
    document.getElementById('type-display').innerHTML = gameState.currentPokemon.types;
    document.getElementById('desc-display').textContent = gameState.currentPokemon.desc;
    document.getElementById('message-box').textContent = "だーれだ？";
  }).catch(e => {
    document.getElementById('message-box').textContent = "エラーが発生しました";
  });
}


function checkAnswer() {
  if (gameState.revealed || !gameState.currentPokemon) return;
  const guess = answerInput.value.trim();
  
  if (guess === gameState.currentPokemon.name) {
    // Correct
    sounds.correct();
    gameState.score++;
    document.getElementById('score-display').textContent = `正解数: ${gameState.score}`;
    
    document.getElementById('message-box').textContent = `正解！ ${gameState.currentPokemon.name}だ！`;
    document.getElementById('message-box').style.color = "#7bed9f";
  } else {
    // Wrong
    sounds.wrong();
    document.getElementById('message-box').textContent = `ざんねん！正解は ${gameState.currentPokemon.name} でした！`;
    document.getElementById('message-box').style.color = "#ff4757";
    if(gameState.mode === 'normal') {
        // ペナルティなし、ただしポイントは入らない
    }
  }
  
  revealPokemon();
}

function revealPokemon() {
  gameState.revealed = true;
  const img = document.getElementById('pokemon-img');
  img.classList.remove('silhouette');
  
  // Reset animation
  img.classList.remove('reveal-anim');
  void img.offsetWidth; // trigger reflow
  img.classList.add('reveal-anim');
  
  img.style.opacity = '1';
  document.getElementById('hard-mode-question').style.display = 'none';
  
  answerInput.disabled = true;
  
  if (gameState.mode.startsWith('timeAttack')) {
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    
    gameState.autoAdvanceTimeout = setTimeout(() => {
      if (document.getElementById('game-screen').classList.contains('active')) {
        loadNextPokemon();
      }
    }, 1200);
  } else {
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'block';
  }
}
