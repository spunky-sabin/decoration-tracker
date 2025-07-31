  // Global variables
        let decorationData = {};
        let obstacleData = {};
        let userDecorations = new Set();
        let userObstacles = new Set();
        let allItems = [];
        let currentFilter = 'all';
        let currentTypeFilter = 'both';
        let imageObserver = null;

        // Compare specific variables
        let compareItems = [];
        let currentCompareFilter = 'all';
        let currentCompareTypeFilter = 'both';

        // Tab switching - Fixed to pass event properly
        function switchTab(tabName, event) {
            // Update tab buttons
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabName + 'Tab').classList.add('active');
        }

        // Initialize Intersection Observer for lazy loading - Enhanced error handling
        function initImageObserver() {
            if ('IntersectionObserver' in window) {
                imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src && !img.src) {
                                img.src = img.dataset.src;
                                img.onload = () => img.classList.add('loaded');
                                img.onerror = () => {
                                    img.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.className = 'decoration-image loaded';
                                    fallback.textContent = '✨';
                                    img.parentElement.insertBefore(fallback, img);
                                };
                            }
                            imageObserver.unobserve(img);
                        }
                    });
                }, { rootMargin: '50px' });
            } else {
                console.warn('IntersectionObserver not supported, falling back to immediate loading');
            }
        }

        // Load decoration data with better error handling
        async function loadDecorationData() {
            try {
                const response = await fetch('finaldeco_updated.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();
                
                decorationData = {};
                jsonData.forEach(item => {
                    decorationData[item.Code] = {
                        name: item.name,
                        image: item.image,
                        type: 'decoration'
                    };
                });
                
                console.log(`Loaded ${Object.keys(decorationData).length} decorations`);
                return true;
            } catch (error) {
                console.error('Error loading decoration data:', error);
                showError('Failed to load decoration data. Please check if finaldeco_updated.json exists.');
                return false;
            }
        }

        // Load obstacle data with better error handling
        async function loadObstacleData() {
            try {
                const response = await fetch('obstacles.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();
                
                obstacleData = {};
                jsonData.forEach(item => {
                    obstacleData[item.Code] = {
                        name: item.name,
                        image: item.image,
                        type: 'obstacle'
                    };
                });
                
                console.log(`Loaded ${Object.keys(obstacleData).length} obstacles`);
                return true;
            } catch (error) {
                console.error('Error loading obstacle data:', error);
                showError('Failed to load obstacle data. Please check if obstacles.json exists.');
                return false;
            }
        }

        // Extract decoration codes from JSON - Enhanced
        function extractCodesFromJSON(obj, codes = new Set()) {
            if (!obj || typeof obj !== 'object') return codes;
            
            if (Array.isArray(obj)) {
                obj.forEach(item => extractCodesFromJSON(item, codes));
            } else {
                if (obj.data && typeof obj.data === 'number') {
                    codes.add(obj.data);
                }
                Object.values(obj).forEach(val => {
                    if (typeof val === 'object') extractCodesFromJSON(val, codes);
                });
            }
            return codes;
        }

        // Filter by type (decoration/obstacle/both)
        function filterByType(type) {
            currentTypeFilter = type;
            if (allItems.length > 0) {
                displayResults();
            }
        }

        function filterCompareByType(type) {
            currentCompareTypeFilter = type;
            if (compareItems.length > 0) {
                displayCompareResults();
            }
        }

        // Filter items by status (all/owned/missing)
        function filterItems(filter) {
            currentFilter = filter;
            applyFilters();
        }

        function filterCompareItems(filter) {
            currentCompareFilter = filter;
            applyCompareFilters();
        }

        // Apply all filters for analyze tab
        function applyFilters() {
            let filtered = [];
            if (currentTypeFilter === 'both') {
                filtered = [...allItems];
            } else {
                filtered = allItems.filter(item => item.type === currentTypeFilter);
            }
            
            if (currentFilter === 'owned') {
                filtered = filtered.filter(d => d.owned);
            } else if (currentFilter === 'missing') {
                filtered = filtered.filter(d => !d.owned);
            }
            
            const searchBox = document.getElementById('searchBox');
            const searchTerm = searchBox ? searchBox.value.toLowerCase() : '';
            if (searchTerm) {
                filtered = filtered.filter(d => 
                    d.name.toLowerCase().includes(searchTerm) || 
                    d.code.toString().includes(searchTerm) ||
                    d.type.toLowerCase().includes(searchTerm)
                );
            }
            
            displayItems(filtered);
        }

        // Apply all filters for compare tab
        function applyCompareFilters() {
            let filtered = [];
            if (currentCompareTypeFilter === 'both') {
                filtered = [...compareItems];
            } else {
                filtered = compareItems.filter(item => item.type === currentCompareTypeFilter);
            }
            
            if (currentCompareFilter === 'player1-only') {
                filtered = filtered.filter(d => d.player1 && !d.player2);
            } else if (currentCompareFilter === 'player2-only') {
                filtered = filtered.filter(d => !d.player1 && d.player2);
            } else if (currentCompareFilter === 'both-players') {
                filtered = filtered.filter(d => d.player1 && d.player2);
            }
            
            const searchBox = document.getElementById('compareSearchBox');
            const searchTerm = searchBox ? searchBox.value.toLowerCase() : '';
            if (searchTerm) {
                filtered = filtered.filter(d => 
                    d.name.toLowerCase().includes(searchTerm) || 
                    d.code.toString().includes(searchTerm) ||
                    d.type.toLowerCase().includes(searchTerm)
                );
            }
            
            displayCompareItems(filtered);
        }

        // Show error message
        function showError(message, isCompare = false) {
            const errorDiv = document.getElementById(isCompare ? 'compareErrorMessage' : 'errorMessage');
            if (errorDiv) {
                errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
            }
        }

        // Clear error message
        function clearError(isCompare = false) {
            const errorDiv = document.getElementById(isCompare ? 'compareErrorMessage' : 'errorMessage');
            if (errorDiv) {
                errorDiv.innerHTML = '';
            }
        }

        // Set button loading state
        function setButtonLoading(isLoading, isCompare = false) {
            const button = document.getElementById(isCompare ? 'compareBtn' : 'analyzeBtn');
            const btnText = document.getElementById(isCompare ? 'compareBtnText' : 'btnText');

            if (!button || !btnText) return;

            if (isLoading) {
                button.disabled = true;
                btnText.innerHTML = `<span class="loading-spinner"></span> ${isCompare ? 'Comparing...' : 'Analyzing...'}`;
                button.style.cursor = 'not-allowed';
            } else {
                button.disabled = false;
                btnText.textContent = isCompare ? 'Compare' : 'Analyze';
                button.style.cursor = 'pointer';
            }
        }

        // Smooth scroll to results with highlight
        function scrollToResults(isCompare = false) {
            const resultsSection = document.getElementById(isCompare ? 'compareResultsSection' : 'resultsSection');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                resultsSection.classList.add('results-highlight');
                setTimeout(() => resultsSection.classList.remove('results-highlight'), 2000);
            }
        }

        // Analyze decorations (enhanced version)
        async function analyzeDecorations() {
            const jsonInput = document.getElementById('jsonInput');
            if (!jsonInput) {
                showError('Input field not found.');
                return;
            }

            const jsonInputValue = jsonInput.value.trim();
            clearError();
            document.getElementById('resultsSection').style.display = 'none';

            if (!Object.keys(decorationData).length && !Object.keys(obstacleData).length) {
                showError('Data is still loading. Please wait a moment and try again.');
                return;
            }

            if (!jsonInputValue) {
                showError('Please paste your JSON data first!');
                return;
            }

            setButtonLoading(true);

            try {
                // Small delay for UI feedback - reduced from unnecessary setTimeout
                const parsedJson = JSON.parse(jsonInputValue);
                const allCodes = extractCodesFromJSON(parsedJson);
                
                userDecorations = new Set();
                userObstacles = new Set();
                
                allCodes.forEach(code => {
                    if (decorationData[code]) {
                        userDecorations.add(code);
                    } else if (obstacleData[code]) {
                        userObstacles.add(code);
                    }
                });

                allItems = [];
                
                Object.entries(decorationData).forEach(([code, details]) => {
                    allItems.push({
                        code: parseInt(code),
                        name: details.name,
                        image: details.image,
                        type: 'decoration',
                        owned: userDecorations.has(parseInt(code))
                    });
                });

                Object.entries(obstacleData).forEach(([code, details]) => {
                    allItems.push({
                        code: parseInt(code),
                        name: details.name,
                        image: details.image,
                        type: 'obstacle',
                        owned: userObstacles.has(parseInt(code))
                    });
                });

                await preloadImages(allItems);
                
                setButtonLoading(false);
                displayResults();
                scrollToResults(false);
                
            } catch (error) {
                console.error("Error parsing JSON:", error);
                setButtonLoading(false);
                
                if (error instanceof SyntaxError) {
                    showError('Invalid JSON format. Please check your data and make sure it\'s properly formatted.');
                } else {
                    showError('An error occurred while analyzing your data. Please try again.');
                }
            }
        }

        // Compare decorations function (enhanced)
        async function compareDecorations() {
            const jsonInput1 = document.getElementById('jsonInput1');
            const jsonInput2 = document.getElementById('jsonInput2');
            
            if (!jsonInput1 || !jsonInput2) {
                showError('Input fields not found.', true);
                return;
            }

            const jsonInputValue1 = jsonInput1.value.trim();
            const jsonInputValue2 = jsonInput2.value.trim();
            clearError(true);
            document.getElementById('compareResultsSection').style.display = 'none';

            if (!Object.keys(decorationData).length && !Object.keys(obstacleData).length) {
                showError('Data is still loading. Please wait a moment and try again.', true);
                return;
            }

            if (!jsonInputValue1 || !jsonInputValue2) {
                showError('Please paste both players\' JSON data!', true);
                return;
            }

            setButtonLoading(true, true);

            try {
                const parsedJson1 = JSON.parse(jsonInputValue1);
                const parsedJson2 = JSON.parse(jsonInputValue2);
                
                const allCodes1 = extractCodesFromJSON(parsedJson1);
                const allCodes2 = extractCodesFromJSON(parsedJson2);
                
                const player1Decorations = new Set();
                const player1Obstacles = new Set();
                const player2Decorations = new Set();
                const player2Obstacles = new Set();
                
                allCodes1.forEach(code => {
                    if (decorationData[code]) {
                        player1Decorations.add(code);
                    } else if (obstacleData[code]) {
                        player1Obstacles.add(code);
                    }
                });

                allCodes2.forEach(code => {
                    if (decorationData[code]) {
                        player2Decorations.add(code);
                    } else if (obstacleData[code]) {
                        player2Obstacles.add(code);
                    }
                });

                compareItems = [];
                
                Object.entries(decorationData).forEach(([code, details]) => {
                    const codeInt = parseInt(code);
                    const player1Has = player1Decorations.has(codeInt);
                    const player2Has = player2Decorations.has(codeInt);
                    
                    compareItems.push({
                        code: codeInt,
                        name: details.name,
                        image: details.image,
                        type: 'decoration',
                        player1: player1Has,
                        player2: player2Has
                    });
                });

                Object.entries(obstacleData).forEach(([code, details]) => {
                    const codeInt = parseInt(code);
                    const player1Has = player1Obstacles.has(codeInt);
                    const player2Has = player2Obstacles.has(codeInt);
                    
                    compareItems.push({
                        code: codeInt,
                        name: details.name,
                        image: details.image,
                        type: 'obstacle',
                        player1: player1Has,
                        player2: player2Has
                    });
                });

                await preloadImages(compareItems);
                
                setButtonLoading(false, true);
                displayCompareResults();
                scrollToResults(true);
                
            } catch (error) {
                console.error("Error parsing JSON:", error);
                setButtonLoading(false, true);
                
                if (error instanceof SyntaxError) {
                    showError('Invalid JSON format. Please check your data and make sure it\'s properly formatted.', true);
                } else {
                    showError('An error occurred while comparing your data. Please try again.', true);
                }
            }
        }

        // Display results for analyze tab
        function displayResults() {
            const resultsSection = document.getElementById('resultsSection');
            const statsContainer = document.getElementById('statsContainer');
            
            if (!resultsSection || !statsContainer) {
                console.error('Results section elements not found');
                return;
            }
            
            resultsSection.style.display = 'block';
            
            let filteredItems = [];
            if (currentTypeFilter === 'both') {
                filteredItems = allItems;
            } else {
                filteredItems = allItems.filter(item => item.type === currentTypeFilter);
            }
            
            const owned = filteredItems.filter(d => d.owned).length;
            const total = filteredItems.length;
            const missing = total - owned;
            const percentage = total ? Math.round((owned / total) * 100) : 0;
            
            const decorationCount = allItems.filter(item => item.type === 'decoration').length;
            const obstacleCount = allItems.filter(item => item.type === 'obstacle').length;
            
            let typeLabel = '';
            if (currentTypeFilter === 'decoration') {
                typeLabel = 'Decorations';
            } else if (currentTypeFilter === 'obstacle') {
                typeLabel = 'Obstacles';
            } else {
                typeLabel = `Items (${decorationCount} Decorations + ${obstacleCount} Obstacles)`;
            }
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${owned}</div>
                    <div class="stat-label">Owned</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${missing}</div>
                    <div class="stat-label">Missing</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${percentage}%</div>
                    <div class="stat-label">Complete</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${total}</div>
                    <div class="stat-label">${typeLabel}</div>
                </div>
            `;
            
            applyFilters();
        }

        // Display results for compare tab
        function displayCompareResults() {
            const resultsSection = document.getElementById('compareResultsSection');
            const statsContainer = document.getElementById('compareStatsContainer');
            
            if (!resultsSection || !statsContainer) {
                console.error('Compare results section elements not found');
                return;
            }
            
            resultsSection.style.display = 'block';
            
            let filteredItems = [];
            if (currentCompareTypeFilter === 'both') {
                filteredItems = compareItems;
            } else {
                filteredItems = compareItems.filter(item => item.type === currentCompareTypeFilter);
            }
            
            const player1Only = filteredItems.filter(d => d.player1 && !d.player2).length;
            const player2Only = filteredItems.filter(d => !d.player1 && d.player2).length;
            const bothPlayers = filteredItems.filter(d => d.player1 && d.player2).length;
            const total = filteredItems.length;
            
            const decorationCount = compareItems.filter(item => item.type === 'decoration').length;
            const obstacleCount = compareItems.filter(item => item.type === 'obstacle').length;
            
            let typeLabel = '';
            if (currentCompareTypeFilter === 'decoration') {
                typeLabel = 'Decorations';
            } else if (currentCompareTypeFilter === 'obstacle') {
                typeLabel = 'Obstacles';
            } else {
                typeLabel = `Items (${decorationCount} Decorations + ${obstacleCount} Obstacles)`;
            }
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${player1Only}</div>
                    <div class="stat-label">Player 1 Only</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${player2Only}</div>
                    <div class="stat-label">Player 2 Only</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${bothPlayers}</div>
                    <div class="stat-label">Both Have</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${total}</div>
                    <div class="stat-label">${typeLabel}</div>
                </div>
            `;
            
            applyCompareFilters();
        }

        // Search items
        function searchItems() {
            applyFilters();
        }

        function searchCompareItems() {
            applyCompareFilters();
        }

        // Display items for analyze tab
        function displayItems(items) {
            const grid = document.getElementById('decorationsGrid');
            if (!grid) {
                console.error('Decorations grid not found');
                return;
            }
            
            grid.innerHTML = '';

            if (!items.length) {
                grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; grid-column: 1/-1;">No items found.</p>';
                return;
            }

            const fragment = document.createDocumentFragment();

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = `decoration-card ${item.owned ? 'owned' : 'missing'} ${item.type}`;

                const imageHtml = item.image 
                    ? `<img class="decoration-image" data-src="${item.image}" alt="${item.name}">`
                    : `<div class="decoration-image loaded">✨</div>`;

                card.innerHTML = `
                    ${imageHtml}
                    <div class="item-type ${item.type}">${item.type}</div>
                    <div class="decoration-name">${item.name}</div>
                    <div class="decoration-code">ID: ${item.code}</div>
                    <span class="status-indicator ${item.owned ? 'status-owned' : 'status-missing'}">
                        ${item.owned ? 'Owned' : 'Missing'}
                    </span>
                `;

                const imgEl = card.querySelector('img');
                if (imageObserver && imgEl) {
                    imageObserver.observe(imgEl);
                } else if (imgEl && !imageObserver) {
                    // Fallback for browsers without IntersectionObserver
                    imgEl.src = imgEl.dataset.src;
                    imgEl.onload = () => imgEl.classList.add('loaded');
                }

                fragment.appendChild(card);
            });

            grid.appendChild(fragment);
        }

        // Display items for compare tab
        function displayCompareItems(items) {
            const grid = document.getElementById('compareDecorationsGrid');
            if (!grid) {
                console.error('Compare decorations grid not found');
                return;
            }
            
            grid.innerHTML = '';

            if (!items.length) {
                grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; grid-column: 1/-1;">No items found.</p>';
                return;
            }

            const fragment = document.createDocumentFragment();

            items.forEach(item => {
                let cardClass = 'decoration-card';
                let statusClass = '';
                let statusText = '';
                
                if (item.player1 && item.player2) {
                    cardClass += ' both-players';
                    statusClass = 'status-both-players';
                    statusText = 'Both Have';
                } else if (item.player1) {
                    cardClass += ' player1-only';
                    statusClass = 'status-player1-only';
                    statusText = 'Player 1 Only';
                } else if (item.player2) {
                    cardClass += ' player2-only';
                    statusClass = 'status-player2-only';
                    statusText = 'Player 2 Only';
                } else {
                    cardClass += ' missing';
                    statusClass = 'status-missing';
                    statusText = 'Neither Has';
                }
                
                cardClass += ` ${item.type}`;

                const card = document.createElement('div');
                card.className = cardClass;

                const imageHtml = item.image 
                    ? `<img class="decoration-image" data-src="${item.image}" alt="${item.name}">`
                    : `<div class="decoration-image loaded">✨</div>`;

                card.innerHTML = `
                    ${imageHtml}
                    <div class="item-type ${item.type}">${item.type}</div>
                    <div class="decoration-name">${item.name}</div>
                    <div class="decoration-code">ID: ${item.code}</div>
                    <span class="status-indicator ${statusClass}">
                        ${statusText}
                    </span>
                `;

                const imgEl = card.querySelector('img');
                if (imageObserver && imgEl) {
                    imageObserver.observe(imgEl);
                } else if (imgEl && !imageObserver) {
                    // Fallback for browsers without IntersectionObserver
                    imgEl.src = imgEl.dataset.src;
                    imgEl.onload = () => imgEl.classList.add('loaded');
                }

                fragment.appendChild(card);
            });

            grid.appendChild(fragment);
        }

        // Preload images with better error handling
        async function preloadImages(items) {
            const promises = items.map(item => {
                return new Promise(resolve => {
                    if (!item.image) return resolve();

                    const img = new Image();
                    img.src = item.image;
                    img.onload = resolve;
                    img.onerror = () => {
                        console.warn('Image failed to load:', img.src);
                        resolve();
                    };
                    
                    // Add timeout for very slow images
                    setTimeout(resolve, 5000);
                });
            });

            return Promise.all(promises);
        }

        // Initialize everything when DOM is loaded
        window.addEventListener('DOMContentLoaded', async () => {
            try {
                initImageObserver();
                
                const [decorationResult, obstacleResult] = await Promise.allSettled([
                    loadDecorationData(), 
                    loadObstacleData()
                ]);
                
                const decorationSuccess = decorationResult.status === 'fulfilled' && decorationResult.value;
                const obstacleSuccess = obstacleResult.status === 'fulfilled' && obstacleResult.value;
                
                if (!decorationSuccess && !obstacleSuccess) {
                    showError('Failed to load any data files. Please ensure finaldeco_updated.json and obstacles.json are available.');
                } else if (!decorationSuccess) {
                    console.warn('Decoration data failed to load, continuing with obstacles only');
                } else if (!obstacleSuccess) {
                    console.warn('Obstacle data failed to load, continuing with decorations only');
                }
                
            } catch (error) {
                console.error('Error during initialization:', error);
                showError('Failed to initialize the application. Please refresh the page and try again.');
            }
        });