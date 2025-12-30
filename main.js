/**
 * Mega da Virada Results Checker
 * 
 * This script powers a single-page application to check Mega da Virada lottery tickets.
 * It fetches game data from a JSON file, allows the user to select the winning numbers,
 * and displays the results in a clear, interactive table.
 * 
 * @author Gemini
 * @version 1.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    // Core variables that hold the application's state.
    let drawnNumbers = new Set(); // Stores the 6 numbers selected by the user.
    let lastBestPrizeLevel = 0;   // Tracks the highest prize won (0: none, 4: Quadra, 5: Quina, 6: Sena) to control animations.
    let GAMES = [];               // Holds the array of all lottery game objects after being processed.

    // --- DOM ELEMENTS ---
    // Cached references to frequently used elements in the DOM for better performance.
    const numberGrid = document.getElementById('number-grid');
    const resultDisplay = document.getElementById('result-display');
    const gamesTableBody = document.getElementById('games-table-body');
    const clearBtn = document.getElementById('clear-btn');
    const filterSwitch = document.getElementById('filter-switch');
    const totalBetsDisplay = document.getElementById('total-bets-display');
    const winnerBanner = document.getElementById('winner-banner');
    const winnerTitle = document.getElementById('winner-title');
    const winnerCounts = document.getElementById('winner-counts');
    const winnerGames = document.getElementById('winner-games');
    const animationOverlay = document.getElementById('animation-overlay');

    // --- HELPER FUNCTIONS ---
    /**
     * Sanitizes a string to be safely used as part of an HTML ID.
     * @param {string} str The input string.
     * @returns {string} The sanitized string.
     */
    const sanitizeForHtml = (str) => str.replace(/[^a-zA-Z0-9-]/g, '_');

    // --- INITIALIZATION ---
    /**
     * The main function to kickstart the application.
     * It fetches game data, renders the initial UI, and sets up event listeners.
     */
    const init = async () => {
        await fetchGames();
        renderNumberGrid();
        renderGamesTable();
        addEventListeners();
    };

    // --- DATA FETCHING ---
    /**
     * Fetches the lottery game data from `games.json`.
     * It processes the raw JSON into a structured array of game objects.
     * This handles both single games (an array of numbers) and multi-bet games (an array of arrays of numbers).
     */
    const fetchGames = async () => {
        try {
            const response = await fetch('games.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const gamesData = await response.json();
            const processedGames = [];
            // Loop through each entry in the JSON file (e.g., "A2CF-...": [numbers])
            for (const id in gamesData) {
                if (id === '_comment') continue; // Ignore the comment key.

                const bets = gamesData[id];
                const sanitizedSourceId = sanitizeForHtml(id);

                // Check if the entry is a multi-bet game (an array of arrays).
                if (Array.isArray(bets) && Array.isArray(bets[0])) {
                    bets.forEach((betNumbers, index) => {
                        const originalId = `${id}-${index + 1}`;
                        processedGames.push({
                            id: originalId,
                            sanitizedId: `${sanitizedSourceId}-${index + 1}`,
                            numbers: betNumbers.map(num => parseInt(num, 10)),
                            source: id // Keep track of the original ticket source.
                        });
                    });
                } else if (Array.isArray(bets)) { // Single-bet game.
                    processedGames.push({
                        id: id,
                        sanitizedId: sanitizedSourceId,
                        numbers: bets.map(num => parseInt(num, 10)),
                        source: id
                    });
                }
            }
            GAMES = processedGames;
            totalBetsDisplay.textContent = `Total: ${GAMES.length}`; // Update total games count.
        } catch (error) {
            console.error("Could not fetch games:", error);
            gamesTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error loading games. Please check the console and the format of games.json.</td></tr>`;
        }
    };

    // --- RENDER FUNCTIONS ---
    /**
     * Renders the 60-number grid for user selection.
     * Highlights numbers that are currently in the `drawnNumbers` set.
     */
    const renderNumberGrid = () => {
        numberGrid.innerHTML = '';
        for (let i = 1; i <= 60; i++) {
            const numStr = String(i).padStart(2, '0');
            const button = document.createElement('button');
            button.textContent = numStr;
            button.classList.add('btn', 'btn-outline-light');
            button.dataset.number = i;
            if (drawnNumbers.has(i)) {
                button.classList.add('selected');
            }
            numberGrid.appendChild(button);
        }
    };

    /**
     * Updates the display showing the currently selected numbers.
     */
    const renderResultDisplay = () => {
        const sortedNumbers = Array.from(drawnNumbers).sort((a, b) => a - b);
        resultDisplay.textContent = sortedNumbers.length > 0 ? sortedNumbers.map(n => String(n).padStart(2, '0')).join('-') : '-';
    };

    /**
     * The core rendering function for the main results table.
     * It calculates hits, handles filtering/sorting, builds the HTML for each game row,
     * and calls the function to update the winner banner.
     */
    const renderGamesTable = () => {
        let gamesToRender = [...GAMES];
        let prizeCounts = { 4: 0, 5: 0, 6: 0 };
        let winningGameIds = { 4: [], 5: [], 6: [] };
        let bestPrizeThisCheck = 0;

        // 1. Calculate hits for every game.
        gamesToRender.forEach(game => {
            const hits = game.numbers.filter(num => drawnNumbers.has(num));
            game.hitsCount = hits.length;
            game.hits = hits; // Store the actual matching numbers.
        });

        // 2. Filter games if the "Show only hits" switch is active.
        if (filterSwitch.checked) {
            gamesToRender = gamesToRender.filter(game => game.hitsCount > 0);
            gamesToRender.sort((a, b) => b.hitsCount - a.hitsCount); // Sort by most hits.
        }

        // 3. Build the HTML string for the table.
        let tableHTML = '';
        gamesToRender.forEach(game => {
            const { hitsCount, hits } = game;

            // Tally up prize winners.
            if (hitsCount >= 4) {
                prizeCounts[hitsCount]++;
                winningGameIds[hitsCount].push(game.id);
                if (hitsCount > bestPrizeThisCheck) bestPrizeThisCheck = hitsCount;
            }

            // Highlight matching numbers within the full number list.
            const numbersHTML = game.numbers.map(n => {
                const numStr = String(n).padStart(2, '0');
                return hits.includes(n) ? `<span class="matched-number">${numStr}</span>` : numStr;
            }).join('-');

            // Generate UI elements for the row.
            const hitsBadge = getPrizeBadge(hitsCount);
            const matchedNumbersStr = hits.map(n => String(n).padStart(2, '0')).join('-');
            const rowClass = getRowClass(hitsCount);

            tableHTML += `
                <tr class="${rowClass}">
                    <td>${game.id}</td>
                    <td class="font-monospace">${numbersHTML}</td>
                    <td>${hitsCount} ${hitsBadge}</td>
                    <td class="font-monospace text-bees-yellow">${matchedNumbersStr}</td>
                </tr>
            `;
        });

        gamesTableBody.innerHTML = tableHTML || `<tr><td colspan="4" class="text-center">No games to display based on current filter.</td></tr>`;
        
        // 4. Update the winner banner UI based on the results.
        updateWinnerUI(prizeCounts, winningGameIds, bestPrizeThisCheck);
    };

    // --- UI UPDATE FUNCTIONS ---
    /**
     * A convenience function to re-render all major UI components at once.
     */
    const updateAllUI = () => {
        renderResultDisplay();
        renderNumberGrid();
        renderGamesTable();
    };

    /**
     * Manages the visibility and content of the winner announcement banner.
     * It triggers celebration animations if a new, higher prize level is reached.
     * @param {object} prizeCounts - Counts of Sena, Quina, Quadra.
     * @param {object} winningGameIds - IDs of the winning games.
     * @param {number} bestPrizeThisCheck - The highest prize level found in the current check.
     */
    const updateWinnerUI = (prizeCounts, winningGameIds, bestPrizeThisCheck) => {
        // Hide banner if no prizes were won.
        if (bestPrizeThisCheck < 4) {
            winnerBanner.classList.remove('show');
            lastBestPrizeLevel = 0;
            return;
        }

        // Trigger a celebration only if we've hit a *new* highest prize level.
        if (bestPrizeThisCheck > lastBestPrizeLevel) {
            triggerCelebration(bestPrizeThisCheck);
        }
        lastBestPrizeLevel = bestPrizeThisCheck;

        // Set the title and styling based on the best prize.
        let title = '';
        winnerBanner.classList.remove('glow-pulse-quina', 'glow-pulse-sena');
        if (bestPrizeThisCheck === 6) {
            title = 'SENA!';
            winnerBanner.classList.add('glow-pulse-sena');
        } else if (bestPrizeThisCheck === 5) {
            title = 'QUINA!';
            winnerBanner.classList.add('glow-pulse-quina');
        } else {
            title = 'QUADRA!';
        }

        winnerTitle.textContent = `Parabéns! Você fez a ${title}`;
        
        // Display the counts of each prize.
        let countsHTML = '';
        if (prizeCounts[6]) countsHTML += `<span class="mx-2"><span class="badge bg-bees-yellow text-dark me-1">${prizeCounts[6]}</span> Sena</span>`;
        if (prizeCounts[5]) countsHTML += `<span class="mx-2"><span class="badge bg-bees-yellow text-dark me-1">${prizeCounts[5]}</span> Quina</span>`;
        if (prizeCounts[4]) countsHTML += `<span class="mx-2"><span class="badge bg-bees-yellow text-dark me-1">${prizeCounts[4]}</span> Quadra</span>`;
        winnerCounts.innerHTML = countsHTML;

        // List the IDs of the winning tickets.
        let gamesHTML = '';
        if (winningGameIds[6] && winningGameIds[6].length) gamesHTML += `Sena: ${winningGameIds[6].join(', ')} <br>`;
        if (winningGameIds[5] && winningGameIds[5].length) gamesHTML += `Quina: ${winningGameIds[5].join(', ')} <br>`;
        if (winningGameIds[4] && winningGameIds[4].length) gamesHTML += `Quadra: ${winningGameIds[4].join(', ')}`;
        winnerGames.innerHTML = gamesHTML;

        // Finally, show the banner.
        winnerBanner.classList.add('show');
    };

    // --- EVENT HANDLERS ---
    /**
     * Sets up all the initial event listeners for the application.
     */
    const addEventListeners = () => {
        numberGrid.addEventListener('click', handleGridClick);
        clearBtn.addEventListener('click', handleClear);
        filterSwitch.addEventListener('change', renderGamesTable);
    };

    /**
     * Handles clicks on the number grid.
     * Adds or removes a number from the `drawnNumbers` set, enforcing a 6-number limit.
     */
    const handleGridClick = (e) => {
        if (e.target.matches('.btn[data-number]')) {
            const num = parseInt(e.target.dataset.number, 10);
            if (drawnNumbers.has(num)) {
                drawnNumbers.delete(num);
            } else {
                if (drawnNumbers.size < 6) {
                    drawnNumbers.add(num);
                }
            }
            updateAllUI();
        }
    };

    /**
     * Handles the click on the 'Clear' button, resetting the selection.
     */
    const handleClear = () => {
        drawnNumbers.clear();
        updateAllUI();
    };

    // --- HELPER FUNCTIONS (Cosmetic) ---
    /**
     * Returns a Bootstrap badge for a given prize level.
     * @param {number} hits - The number of matching numbers.
     * @returns {string} The HTML string for the badge.
     */
    const getPrizeBadge = (hits) => {
        if (hits === 6) return `<span class="badge bg-warning text-dark prize-badge">Sena</span>`;
        if (hits === 5) return `<span class="badge bg-info text-dark prize-badge">Quina</span>`;
        if (hits === 4) return `<span class="badge bg-light text-dark prize-badge">Quadra</span>`;
        return '';
    };

    /**
     * Returns a CSS class for the table row based on the number of hits, used for styling.
     * @param {number} hits - The number of matching numbers.
     * @returns {string} The CSS class name.
     */
    const getRowClass = (hits) => {
        if (hits === 6) return 'table-row-sena shine-effect';
        if (hits === 5) return 'table-row-quina shine-effect';
        if (hits === 4) return 'table-row-quadra';
        if (hits > 0) return 'table-row-hit';
        return '';
    }

    // --- CELEBRATION ANIMATIONS ---
    /**
     * Triggers the appropriate celebration animation based on the prize level.
     * @param {number} prizeLevel - The prize level (4, 5, or 6).
     */
    const triggerCelebration = (prizeLevel) => {
        if (prizeLevel === 4) createConfetti(40);
        if (prizeLevel === 5) createConfetti(80);
        if (prizeLevel === 6) {
            createConfetti(100);
            createFireworks(5, 30); // Launch fireworks for the grand prize!
        }
    };

    /**
     * Creates a specified number of confetti particles and animates them.
     * @param {number} count - The number of confetti particles to create.
     */
    const createConfetti = (count) => {
        const colors = ['#FFC400', '#FFD54A', '#FFFFFF', '#4db8ff'];
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle', 'confetti');
            const x = Math.random() * 100;
            const y = -20;
            const animDuration = Math.random() * 2 + 3;
            const animDelay = Math.random() * 2;
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = `${x}vw`;
            particle.style.top = `${y}px`;
            particle.style.transform = `rotate(${Math.random() * 360}deg)`;
            // Use Web Animations API for clean, performant animations.
            particle.animate([{ top: `${y}px`, opacity: 1 }, { top: `110vh`, opacity: 0 }], { duration: animDuration * 1000, delay: animDelay * 1000, easing: 'ease-out' });
            animationOverlay.appendChild(particle);
            // Clean up the particle from the DOM after the animation is complete.
            setTimeout(() => particle.remove(), (animDuration + animDelay) * 1000);
        }
    };

    /**
     * Creates a firework burst effect.
     * @param {number} fireworkCount - The number of bursts.
     * @param {number} particleCount - The number of particles per burst.
     */
    const createFireworks = (fireworkCount, particleCount) => {
        const colors = ['#FFC400', '#FFD54A', '#FFFFFF'];
        for (let i = 0; i < fireworkCount; i++) {
            const startX = Math.random() * 50 + 25;
            const startY = Math.random() * 50 + 25;
            // Stagger the fireworks for a more natural display.
            setTimeout(() => {
                for (let j = 0; j < particleCount; j++) {
                    const particle = document.createElement('div');
                    particle.classList.add('firework');
                    const angle = Math.random() * 360;
                    const velocity = Math.random() * 50 + 50;
                    const rad = angle * Math.PI / 180;
                    const endX = Math.cos(rad) * velocity;
                    const endY = Math.sin(rad) * velocity;
                    particle.style.left = `${startX}vw`;
                    particle.style.top = `${startY}vh`;
                    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    particle.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${endX}px, ${endY}px) scale(0)`, opacity: 0.5 }], { duration: 1200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
                    animationOverlay.appendChild(particle);
                    setTimeout(() => particle.remove(), 1200);
                }
            }, i * 300);
        }
    };

    // --- START THE APP ---
    init();
});
