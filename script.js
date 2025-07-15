// Configuration Firebase
const firebaseConfig = {
    //your Firebase configuration
};

// AuthManager JavaScript (remplace auth.js)
class AuthManager {
    constructor() {
        this.user = null;
        this.apiKey = firebaseConfig.apiKey;
        this.databaseURL = firebaseConfig.databaseURL;
        this.initializeAuth();
        this.bindEvents();
    }

    initializeAuth() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.user = JSON.parse(userData);
            this.updateUI();
        }
    }

    bindEvents() {
        document.getElementById('login-btn').addEventListener('click', () => this.showLogin());
        document.getElementById('register-btn').addEventListener('click', () => this.showRegister());
        document.getElementById('scores-btn').addEventListener('click', () => this.showScores());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));

        document.getElementById('close-login').addEventListener('click', () => this.hideLogin());
        document.getElementById('close-register').addEventListener('click', () => this.hideRegister());
        document.getElementById('close-scores').addEventListener('click', () => this.hideScores());
    }

    showLogin() {
        document.getElementById('login-modal').style.display = 'flex';
    }

    hideLogin() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('login-message').innerHTML = '';
    }

    showRegister() {
        document.getElementById('register-modal').style.display = 'flex';
    }

    hideRegister() {
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('register-message').innerHTML = '';
    }

    showScores() {
        document.getElementById('scores-modal').style.display = 'flex';
        this.loadScores();
    }

    hideScores() {
        document.getElementById('scores-modal').style.display = 'none';
    }

    // Connexion Firebase
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            });

            const result = await response.json();

            if (response.ok && result.idToken) {
                this.user = {
                    idToken: result.idToken,
                    localId: result.localId,
                    email: email
                };
                localStorage.setItem('userData', JSON.stringify(this.user));
                this.updateUI();
                this.hideLogin();
                document.getElementById('login-form').reset();
            } else {
                const errorMessage = result.error?.message || 'Erreur de connexion';
                document.getElementById('login-message').innerHTML = `<p style="color: red;">${errorMessage}</p>`;
            }
        } catch (error) {
            document.getElementById('login-message').innerHTML = '<p style="color: red;">Erreur de connexion</p>';
        }
    }

    // Inscription Firebase
    async handleRegister(e) {
        e.preventDefault();

        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-password-confirm').value;
        const messageEl = document.getElementById('register-message');

        if (password !== confirmPassword) {
            messageEl.innerHTML = '<p style="color: red;">Les mots de passe ne correspondent pas.</p>';
            return;
        }

        try {
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            });

            const result = await response.json();

            if (response.ok && result.localId) {
                messageEl.innerHTML = '<p style="color: green;">Inscription réussie !</p>';
                setTimeout(() => {
                    this.hideRegister();
                    this.showLogin();
                }, 2000);
            } else {
                const errorMessage = result.error?.message || 'Erreur d\'inscription';
                messageEl.innerHTML = `<p style="color: red;">${errorMessage}</p>`;
            }
        } catch (error) {
            messageEl.innerHTML = '<p style="color: red;">Erreur d\'inscription</p>';
        }
    }

    // Chargement des scores depuis Firebase Realtime Database
    async loadScores() {
        try {
            const response = await fetch(`${this.databaseURL}/scores.json`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const scores = [];

            if (data) {
                Object.keys(data).forEach(userId => {
                    const userScoreData = data[userId];
                    const email = userScoreData.lastUpdate?.email || 'Anonyme';
                    const score = parseInt(userScoreData.totalScore || 0);
                    const timestamp = userScoreData.lastUpdate?.timestamp || Date.now() / 1000;

                    // Extract username from email
                    let username = email;
                    if (email !== 'Anonyme') {
                        const atPos = email.indexOf('@');
                        if (atPos !== -1) {
                            username = email.substring(0, atPos);
                        }
                    }

                    scores.push({
                        email: email,
                        username: username,
                        score: score,
                        timestamp: timestamp
                    });
                });

                // Sort by score descending
                scores.sort((a, b) => b.score - a.score);
            }

            this.displayScores(scores);
        } catch (error) {
            console.error("Erreur de chargement:", error);
            document.getElementById('scores-content').innerHTML = `
                <p>Erreur technique</p>
                <p>${error.message}</p>
            `;
        }
    }

    displayScores(scores) {
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr><th>Pseudo</th><th>Score</th><th>Date</th></tr></thead>';
        html += '<tbody>';

        if (scores && scores.length > 0) {
            scores.forEach(score => {
                html += `<tr>
                    <td>${score.username}</td>
                    <td>${score.score}</td>
                    <td>${new Date(score.timestamp * 1000).toLocaleDateString()}</td>
                </tr>`;
            });
        } else {
            html += '<tr><td colspan="3">Aucun score enregistré</td></tr>';
        }

        html += '</tbody></table>';
        document.getElementById('scores-content').innerHTML = html;
    }

    // Sauvegarder le score dans Firebase
    async saveScore(score) {
        if (!this.user) return;

        try {
            // Vérifier d'abord le token
            const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: this.user.idToken
                })
            });

            if (!tokenResponse.ok) {
                throw new Error('Token invalide');
            }

            const userId = this.user.localId;
            const scoreValue = parseInt(score);

            // Récupérer le score actuel
            const currentScoreResponse = await fetch(`${this.databaseURL}/scores/${userId}/totalScore.json`);
            let currentScore = 0;

            if (currentScoreResponse.ok) {
                const currentScoreData = await currentScoreResponse.json();
                currentScore = currentScoreData || 0;
            }

            // Calculer le nouveau score
            const newScore = scoreValue + currentScore;

            // Sauvegarder le nouveau score
            const saveResponse = await fetch(`${this.databaseURL}/scores/${userId}.json`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    totalScore: newScore,
                    lastUpdate: {
                        timestamp: Math.floor(Date.now() / 1000),
                        email: this.user.email
                    }
                })
            });

            if (saveResponse.ok) {
                const extraArea = document.getElementById('extra-score-area');
                if (extraArea) {
                    extraArea.innerHTML = `
                        <p class="score-display">Score : ${scoreValue} points</p>
                        <p class="score-added-message" style="color: var(--green-lol);">Score ajouté à votre compte !</p>
                    `;
                }
            } else {
                throw new Error('Erreur lors de la sauvegarde');
            }

        } catch (error) {
            console.error('Erreur lors de l\'enregistrement :', error);
        }
    }

    logout() {
        this.user = null;
        localStorage.removeItem('userData');
        this.updateUI();
    }

    updateUI() {
        if (this.user) {
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('register-btn').style.display = 'none';
            document.getElementById('scores-btn').style.display = 'inline-block';
            document.getElementById('logout-btn').style.display = 'inline-block';
            document.getElementById('user-email').style.display = 'inline-block';
            document.getElementById('user-email').textContent = this.user.email;
        } else {
            document.getElementById('login-btn').style.display = 'inline-block';
            document.getElementById('register-btn').style.display = 'inline-block';
            document.getElementById('scores-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('user-email').style.display = 'none';
        }
    }

    isLoggedIn() {
        return this.user !== null;
    }
}

// Classe du jeu (mise à jour pour utiliser la nouvelle AuthManager)
class LoldleGame {
    constructor() {
        this.champions = [];
        this.targetChampion = null;
        this.championNames = [];
        this.currentSuggestionIndex = -1;
        this.guessedChampions = [];
        this.gameEnded = false;

        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadChampions();
        this.hideLoading();
        this.setupEventListeners();
        this.selectRandomChampion();
    }

    showLoading() {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '<div class="loading">Chargement des champions...</div>';
        document.getElementById('champion-input').disabled = true;
        document.getElementById('validate-btn').disabled = true;
    }

    hideLoading() {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';
        document.getElementById('champion-input').disabled = false;
        document.getElementById('validate-btn').disabled = false;
    }

    async loadChampions() {
        try {
            const response = await fetch('data/champions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.champions = await response.json();
            this.championNames = this.champions.map(c => c.name[0]);
            console.log('Champions chargés:', this.champions.length);
        } catch (error) {
            console.error('Erreur lors du chargement des champions:', error);
            this.showError('Erreur lors du chargement des champions. Vérifiez que le fichier champions.json est présent.');

            // Données de test en cas d'erreur
            this.champions = [
                {
                    name: ["Evelynn"],
                    gender: ["Female"],
                    positions: ["Jungle"],
                    species: ["Demon", "Spirit"],
                    resource: ["Mana"],
                    range_type: ["Melee"],
                    regions: ["Runeterra"],
                    release_year: ["2009"]
                },
                {
                    name: ["Ahri"],
                    gender: ["Female"],
                    positions: ["Mid"],
                    species: ["Vastayan"],
                    resource: ["Mana"],
                    range_type: ["Ranged"],
                    regions: ["Ionia"],
                    release_year: ["2011"]
                },
                {
                    name: ["Akali"],
                    gender: ["Female"],
                    positions: ["Mid", "Top"],
                    species: ["Human"],
                    resource: ["Energy"],
                    range_type: ["Melee"],
                    regions: ["Ionia"],
                    release_year: ["2010"]
                },
                {
                    name: ["Ashe"],
                    gender: ["Female"],
                    positions: ["Bot"],
                    species: ["Human"],
                    resource: ["Mana"],
                    range_type: ["Ranged"],
                    regions: ["Freljord"],
                    release_year: ["2009"]
                },
                {
                    name: ["Garen"],
                    gender: ["Male"],
                    positions: ["Top"],
                    species: ["Human"],
                    resource: ["Mana"],
                    range_type: ["Melee"],
                    regions: ["Demacia"],
                    release_year: ["2010"]
                },
                {
                    name: ["Jinx"],
                    gender: ["Female"],
                    positions: ["Bot"],
                    species: ["Human"],
                    resource: ["Mana"],
                    range_type: ["Ranged"],
                    regions: ["Zaun"],
                    release_year: ["2013"]
                }
            ];
            this.championNames = this.champions.map(c => c.name[0]);
        }
    }

    selectRandomChampion() {
        const availableChampions = this.champions.filter(c =>
            !this.guessedChampions.some(g => g.name[0] === c.name[0])
        );

        if (availableChampions.length === 0) {
            console.log('Tous les champions ont été devinés !');
            return;
        }

        const randomIndex = Math.floor(Math.random() * availableChampions.length);
        this.targetChampion = availableChampions[randomIndex];
    }

    setupEventListeners() {
        const input = document.getElementById('champion-input');
        const validateBtn = document.getElementById('validate-btn');
        const suggestions = document.getElementById('suggestions');

        input.addEventListener('input', (e) => this.handleInput(e));
        input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        validateBtn.addEventListener('click', () => this.validateGuess());

        suggestions.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                const name = suggestionItem.querySelector('.suggestion-name').textContent;
                this.selectSuggestion(name);
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-container')) {
                suggestions.style.display = 'none';
            }
        });
    }

    handleInput(e) {
        const value = e.target.value.trim();
        this.currentSuggestionIndex = -1;

        if (value === '') {
            this.hideSuggestions();
            return;
        }

        const filtered = this.championNames.filter(name =>
            name.toLowerCase().startsWith(value.toLowerCase()) &&
            !this.guessedChampions.some(c => c.name[0] === name)
        );

        this.showSuggestions(filtered);
    }

    handleKeyDown(e) {
        const suggestions = document.getElementById('suggestions');
        const items = suggestions.querySelectorAll('.suggestion-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.currentSuggestionIndex = Math.min(this.currentSuggestionIndex + 1, items.length - 1);
            this.updateSuggestionSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, -1);
            this.updateSuggestionSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.currentSuggestionIndex >= 0 && items[this.currentSuggestionIndex]) {
                const name = items[this.currentSuggestionIndex].querySelector('.suggestion-name').textContent;
                this.selectSuggestion(name);
            } else if (items.length > 0) {
                const name = items[0].querySelector('.suggestion-name').textContent;
                this.selectSuggestion(name);
            }
            this.validateGuess();
        } else if (e.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    updateSuggestionSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.currentSuggestionIndex);
        });
    }

    showSuggestions(suggestions) {
        const suggestionsDiv = document.getElementById('suggestions');

        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        const limitedSuggestions = suggestions.slice(0, 8);

        suggestionsDiv.innerHTML = limitedSuggestions
            .map(name => `
                <div class="suggestion-item">
                    <img class="suggestion-image" src="${this.getChampionImageUrl(name)}" alt="${name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjIwIiB5PSIyNCIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Pz88L3RleHQ+Cjwvc3ZnPgo='">
                    <span class="suggestion-name">${name}</span>
                </div>
            `)
            .join('');

        suggestionsDiv.style.display = 'block';
    }

    hideSuggestions() {
        document.getElementById('suggestions').style.display = 'none';
    }

    selectSuggestion(name) {
        document.getElementById('champion-input').value = name;
        this.hideSuggestions();
        document.getElementById('champion-input').focus();
    }

    validateGuess() {
        if (this.gameEnded) return;

        const input = document.getElementById('champion-input');
        const guessName = input.value.trim();

        if (guessName === '') {
            this.showError('Veuillez entrer un nom de champion');
            return;
        }

        const guessedChampion = this.champions.find(c =>
            c.name[0].toLowerCase() === guessName.toLowerCase()
        );

        if (!guessedChampion) {
            this.showError('Champion inconnu !');
            return;
        }

        if (this.guessedChampions.some(c => c.name[0] === guessedChampion.name[0])) {
            this.showError('Champion déjà deviné !');
            return;
        }

        this.guessedChampions.push(guessedChampion);
        this.addGuessResult(guessedChampion);
        input.value = '';
        this.hideError();

        if (guessedChampion.name[0] === this.targetChampion.name[0]) {
            document.getElementById('champion-input').disabled = true;
            document.getElementById('validate-btn').disabled = true;

            setTimeout(() => {
                this.showSuccess();
            }, 3000);
        }
    }

    addGuessResult(guessedChampion) {
        const resultsContainer = document.getElementById('results');
        const row = document.createElement('div');
        row.className = 'guess-row';

        const img = document.createElement('img');
        img.className = 'champion-image';
        img.src = this.getChampionImageUrl(guessedChampion.name[0]);
        img.alt = guessedChampion.name[0];
        img.onerror = () => {
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSIzNiIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Pz88L3RleHQ+Cjwvc3ZnPgo=';
        };
        row.appendChild(img);

        const comparisons = [
            { guess: guessedChampion.name, target: this.targetChampion.name },
            { guess: guessedChampion.gender, target: this.targetChampion.gender },
            { guess: guessedChampion.positions, target: this.targetChampion.positions },
            { guess: guessedChampion.species, target: this.targetChampion.species },
            { guess: guessedChampion.resource, target: this.targetChampion.resource },
            { guess: guessedChampion.range_type, target: this.targetChampion.range_type },
            { guess: guessedChampion.regions, target: this.targetChampion.regions },
            { guess: guessedChampion.release_year, target: this.targetChampion.release_year }
        ];

        comparisons.forEach(({ guess, target }) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = guess.join(', ');

            const status = this.compareArrays(guess, target);
            cell.classList.add(status);

            row.appendChild(cell);
        });

        resultsContainer.insertBefore(row, resultsContainer.firstChild);
    }

    compareArrays(guess, target) {
        if (JSON.stringify(guess.sort()) === JSON.stringify(target.sort())) {
            return 'correct';
        }

        for (const g of guess) {
            if (target.includes(g)) {
                return 'partial';
            }
        }

        return 'wrong';
    }

    getChampionImageUrl(championName) {
        return `https://ddragon.leagueoflegends.com/cdn/14.9.1/img/champion/${championName}.png`;
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => this.hideError(), 3000);
    }

    hideError() {
        document.getElementById('error-message').style.display = 'none';
    }

    showSuccess() {
        this.gameEnded = true;
        const modalOverlay = document.getElementById('victory-modal');
        const successDiv = document.getElementById('success-message');
        const attempts = this.guessedChampions.length;
        const score = this.calculateScore(attempts);

        successDiv.innerHTML = `
            <h2>🎉 Félicitations ! 🎉</h2>
            <p>Vous avez trouvé le champion mystère :</p>
            <p class="champion-name">${this.targetChampion.name[0]}</p>
            <p>En ${attempts} tentative${attempts > 1 ? 's' : ''} !</p>
        `;

        const extraArea = document.getElementById('extra-score-area');
        extraArea.innerHTML = '';

        if (authManager.isLoggedIn()) {
            authManager.saveScore(score);
        } else {
            extraArea.innerHTML = `
                <p class="score-display">Score : ${score} points</p>
                <button id="btn-login-from-score" class="login-from-score-btn">
                    Se connecter pour enregistrer le score
                </button>
            `;

            document.getElementById('btn-login-from-score').addEventListener('click', () => {
                modalOverlay.style.display = 'none';
                document.getElementById('login-modal').style.display = 'flex';
            });
        }

        modalOverlay.style.display = 'flex';

        document.getElementById('modal-restart-btn').addEventListener('click', () => {
            modalOverlay.style.display = 'none';
            this.restartGame();
        });
    }

    calculateScore(attempts) {
        const baseScore = 1000;
        const penalty = (attempts - 1) * 50;
        return Math.max(baseScore - penalty, 100);
    }

    restartGame() {
        this.guessedChampions = [];
        this.gameEnded = false;
        this.currentSuggestionIndex = -1;

        document.getElementById('results').innerHTML = '';
        document.getElementById('champion-input').disabled = false;
        document.getElementById('validate-btn').disabled = false;
        document.getElementById('champion-input').value = '';
        document.getElementById('error-message').style.display = 'none';

        this.hideSuggestions();
        this.selectRandomChampion();
        document.getElementById('champion-input').focus();
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    window.loldleGame = new LoldleGame();
});