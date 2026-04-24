// Game Variables
let cards = [];
let flippedCards = [];
let matchedCards = [];
let moves = 0;
let score = 0;
let timer = null;
let seconds = 0;
let minutes = 0;
let isGameActive = false;
let currentDifficulty = 'medium';
let canFlip = true;
let bestScore = 0;

// Card Icons
const cardIcons = [
    'fa-heart', 'fa-star', 'fa-moon', 'fa-sun', 'fa-cloud', 'fa-tree',
    'fa-crown', 'fa-dragon', 'fa-feather', 'fa-gem', 'fa-leaf', 'fa-music',
    'fa-palette', 'fa-rocket', 'fa-snowflake', 'fa-bolt', 'fa-cat', 'fa-dog',
    'fa-fish', 'fa-flower', 'fa-globe', 'fa-key', 'fa-lock', 'fa-magnet'
];

// Difficulty configurations
const difficultySettings = {
    easy: { pairs: 6, cols: 4, rows: 3 },   // 12 cards
    medium: { pairs: 8, cols: 4, rows: 4 },  // 16 cards
    hard: { pairs: 12, cols: 6, rows: 4 }    // 24 cards
};

// Load best score from localStorage
function loadBestScore() {
    const saved = localStorage.getItem('memoryBestScore');
    if (saved) {
        bestScore = parseInt(saved);
        document.getElementById('bestScore').textContent = bestScore;
    }
}

// Save best score
function saveBestScore() {
    if (score > bestScore) {
        bestScore = score;
        document.getElementById('bestScore').textContent = bestScore;
        localStorage.setItem('memoryBestScore', bestScore);
    }
}

// Load leaderboard
function loadLeaderboard() {
    const leaderboard = localStorage.getItem('memoryLeaderboard');
    if (leaderboard) {
        return JSON.parse(leaderboard);
    }
    return [];
}

// Save to leaderboard
function saveToLeaderboard(moves, time, score) {
    const leaderboard = loadLeaderboard();
    leaderboard.push({
        moves: moves,
        time: time,
        score: score,
        date: new Date().toISOString(),
        difficulty: currentDifficulty
    });
    
    // Sort by score (higher is better) then by moves (fewer is better)
    leaderboard.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.moves - b.moves;
    });
    
    // Keep only top 10
    const top10 = leaderboard.slice(0, 10);
    localStorage.setItem('memoryLeaderboard', JSON.stringify(top10));
    displayLeaderboard();
}

// Display leaderboard
function displayLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    const leaderboard = loadLeaderboard();
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-state-leaderboard">
                <i class="fas fa-trophy"></i>
                <p>No scores yet. Play a game to appear here!</p>
            </div>
        `;
        return;
    }
    
    leaderboardList.innerHTML = leaderboard.map((entry, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';
        
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${rankClass}">
                    ${index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div class="leaderboard-details">
                    <div>Moves: ${entry.moves} | Time: ${entry.time}</div>
                    <div class="leaderboard-date">${new Date(entry.date).toLocaleDateString()}</div>
                </div>
                <div class="leaderboard-score">${entry.score} pts</div>
            </div>
        `;
    }).join('');
}

// Clear leaderboard
function clearLeaderboard() {
    if (confirm('Are you sure you want to clear the leaderboard?')) {
        localStorage.removeItem('memoryLeaderboard');
        displayLeaderboard();
        showNotification('Leaderboard cleared!', 'info');
    }
}

// Generate cards
function generateCards() {
    const settings = difficultySettings[currentDifficulty];
    const totalCards = settings.pairs * 2;
    
    // Select icons for this game
    const selectedIcons = cardIcons.slice(0, settings.pairs);
    
    // Create pairs
    let cardDeck = [];
    selectedIcons.forEach(icon => {
        cardDeck.push({ icon: icon, matched: false, flipped: false });
        cardDeck.push({ icon: icon, matched: false, flipped: false });
    });
    
    // Shuffle cards
    for (let i = cardDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardDeck[i], cardDeck[j]] = [cardDeck[j], cardDeck[i]];
    }
    
    return cardDeck;
}

// Render game board
function renderBoard() {
    const gameBoard = document.getElementById('gameBoard');
    const settings = difficultySettings[currentDifficulty];
    
    gameBoard.className = `game-board ${currentDifficulty}`;
    
    gameBoard.innerHTML = cards.map((card, index) => `
        <div class="card ${card.flipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}" 
             data-index="${index}"
             onclick="handleCardClick(${index})">
            <div class="card-back"></div>
            <div class="card-front">
                <i class="fas ${card.icon}"></i>
            </div>
        </div>
    `).join('');
}

// Handle card click
function handleCardClick(index) {
    if (!isGameActive) return;
    if (!canFlip) return;
    
    const card = cards[index];
    
    // Prevent clicking on already matched or flipped cards
    if (card.matched) return;
    if (card.flipped) return;
    if (flippedCards.length === 2) return;
    
    // Flip the card
    card.flipped = true;
    renderBoard();
    
    // Add to flipped cards
    flippedCards.push(index);
    
    // Check for match when 2 cards are flipped
    if (flippedCards.length === 2) {
        canFlip = false;
        moves++;
        document.getElementById('moves').textContent = moves;
        
        const card1Index = flippedCards[0];
        const card2Index = flippedCards[1];
        const card1 = cards[card1Index];
        const card2 = cards[card2Index];
        
        if (card1.icon === card2.icon) {
            // Match found
            setTimeout(() => {
                card1.matched = true;
                card2.matched = true;
                matchedCards.push(card1Index, card2Index);
                flippedCards = [];
                
                // Update score
                const timeBonus = Math.max(0, 60 - (seconds + minutes * 60));
                const moveBonus = Math.max(0, 50 - moves);
                score += 10 + Math.floor(timeBonus / 10) + Math.floor(moveBonus / 5);
                document.getElementById('score').textContent = score;
                
                renderBoard();
                canFlip = true;
                
                // Check win
                if (matchedCards.length === cards.length) {
                    endGame();
                }
            }, 300);
        } else {
            // No match
            setTimeout(() => {
                card1.flipped = false;
                card2.flipped = false;
                flippedCards = [];
                renderBoard();
                canFlip = true;
                
                // Add shake animation
                const elements = document.querySelectorAll('.card');
                if (elements[card1Index]) elements[card1Index].classList.add('shake');
                if (elements[card2Index]) elements[card2Index].classList.add('shake');
                setTimeout(() => {
                    if (elements[card1Index]) elements[card1Index].classList.remove('shake');
                    if (elements[card2Index]) elements[card2Index].classList.remove('shake');
                }, 300);
            }, 500);
        }
    }
}

// Start timer
function startTimer() {
    if (timer) clearInterval(timer);
    
    timer = setInterval(() => {
        if (isGameActive) {
            seconds++;
            if (seconds === 60) {
                minutes++;
                seconds = 0;
            }
            
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('timer').textContent = timeString;
        }
    }, 1000);
}

// Stop timer
function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// Reset game
function resetGame() {
    stopTimer();
    isGameActive = false;
    flippedCards = [];
    matchedCards = [];
    moves = 0;
    score = 0;
    seconds = 0;
    minutes = 0;
    canFlip = true;
    
    document.getElementById('moves').textContent = '0';
    document.getElementById('score').textContent = '0';
    document.getElementById('timer').textContent = '00:00';
    
    generateNewGame();
}

// Generate new game
function generateNewGame() {
    cards = generateCards();
    renderBoard();
}

// Start new game
function startNewGame() {
    resetGame();
    isGameActive = true;
    startTimer();
}

// End game
function endGame() {
    isGameActive = false;
    stopTimer();
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Save best score
    saveBestScore();
    
    // Save to leaderboard
    saveToLeaderboard(moves, timeString, score);
    
    // Show win modal
    document.getElementById('winMoves').textContent = moves;
    document.getElementById('winTime').textContent = timeString;
    document.getElementById('winScore').textContent = score;
    
    let message = '';
    if (score >= 500) message = 'Legendary performance! 🏆';
    else if (score >= 400) message = 'Amazing memory! 🌟';
    else if (score >= 300) message = 'Great job! 🎉';
    else if (score >= 200) message = 'Good work! 👍';
    else message = 'Nice try! Keep practicing! 💪';
    
    document.getElementById('winMessage').textContent = message;
    
    const winModal = new bootstrap.Modal(document.getElementById('winModal'));
    winModal.show();
}

// Change difficulty
function changeDifficulty(difficulty) {
    currentDifficulty = difficulty;
    resetGame();
    
    // Update active button
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.difficulty === difficulty) {
            btn.classList.add('active');
        }
    });
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} position-fixed top-0 start-50 translate-middle-x mt-3`;
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.animation = 'fadeIn 0.3s ease';
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Event Listeners
document.getElementById('newGameBtn').addEventListener('click', startNewGame);
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('playAgainBtn').addEventListener('click', () => {
    bootstrap.Modal.getInstance(document.getElementById('winModal')).hide();
    startNewGame();
});
document.getElementById('clearLeaderboard').addEventListener('click', clearLeaderboard);

// Difficulty buttons
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        changeDifficulty(btn.dataset.difficulty);
    });
});

// Initialize game
function init() {
    loadBestScore();
    displayLeaderboard();
    generateNewGame();
    
    // Don't auto-start, wait for user
    showNotification('Click "New Game" to start playing!', 'info');
}

// Make functions global for onclick handlers
window.handleCardClick = handleCardClick;

// Start
init();