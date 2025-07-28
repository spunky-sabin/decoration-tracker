let decorationData = {};
let obstacleData = {};
let userDecorations = new Set();
let userObstacles = new Set();
let allItems = [];
let currentFilter = 'all';
let currentTypeFilter = 'both';
let imageObserver;
let imageErrors = 0;
let totalImagesToLoad = 0;
let imagesLoaded = 0;

// Initialize Intersection Observer for lazy loading
function initImageObserver() {
    imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src && !img.src) {
                    img.src = img.dataset.src;
                    img.onload = () => img.classList.add('loaded');
                    img.onerror = () => {
                        // Fixed: Use proper fallback display
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
}

// Load decoration data
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
    } catch (error) {
        console.error('Error loading decoration data:', error);
        showError('Failed to load decoration data. Please check if finaldeco_updated.json exists.');
    }
}

// Load obstacle data
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
    } catch (error) {
        console.error('Error loading obstacle data:', error);
        showError('Failed to load obstacle data. Please check if obstacles.json exists.');
    }
}

// Extract decoration codes from JSON
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
function filterByType(type, event) {
    currentTypeFilter = type;
    
    if (event) {
        document.querySelectorAll('.type-filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    
    if (allItems.length > 0) {
        displayResults();
    }
}

// Filter items by status (all/owned/missing)
function filterItems(filter, event) {
    currentFilter = filter;
    
    if (event) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    
    applyFilters();
}

// Apply all filters
function applyFilters() {
    // First filter by type
    let filtered = [];
    if (currentTypeFilter === 'both') {
        filtered = [...allItems];
    } else {
        filtered = allItems.filter(item => item.type === currentTypeFilter);
    }
    
    // Then filter by status
    if (currentFilter === 'owned') {
        filtered = filtered.filter(d => d.owned);
    } else if (currentFilter === 'missing') {
        filtered = filtered.filter(d => !d.owned);
    }
    
    // Finally apply search filter
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

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Clear error message
function clearError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.innerHTML = '';
    }
}

// Set analyze button loading state
function setAnalyzeButtonLoading(isLoading) {
    const button = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');

    if (!button || !btnText) return;

    if (isLoading) {
        button.disabled = true;
        btnText.innerHTML = '<span class="loading-spinner"></span> Analyzing...';
        button.style.cursor = 'not-allowed';
    } else {
        button.disabled = false;
        btnText.textContent = 'Analyze';
        button.style.cursor = 'pointer';
    }
}

// Analyze decorations
async function analyzeDecorations() {
    const jsonInput = document.getElementById('jsonInput');
    if (!jsonInput) {
        showError('Input field not found.');
        return;
    }

    const jsonInputValue = jsonInput.value.trim();
    clearError();
    document.getElementById('resultsSection').style.display = 'none';

    // Check if data is loaded
    if (!Object.keys(decorationData).length && !Object.keys(obstacleData).length) {
        showError('Data is still loading. Please wait a moment and try again.');
        return;
    }

    // Check if input is provided
    if (!jsonInputValue) {
        showError('Please paste your JSON data first!');
        return;
    }

    setAnalyzeButtonLoading(true);

    try {
        // Add small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const parsedJson = JSON.parse(jsonInputValue);
        const allCodes = extractCodesFromJSON(parsedJson);
        
        // Separate decorations and obstacles
        userDecorations = new Set();
        userObstacles = new Set();
        
        allCodes.forEach(code => {
            if (decorationData[code]) {
                userDecorations.add(code);
            } else if (obstacleData[code]) {
                userObstacles.add(code);
            }
        });

        // Create combined array
        allItems = [];
        
        // Add decorations
        Object.entries(decorationData).forEach(([code, details]) => {
            allItems.push({
                code: parseInt(code),
                name: details.name,
                image: details.image,
                type: 'decoration',
                owned: userDecorations.has(parseInt(code))
            });
        });

        // Add obstacles
        Object.entries(obstacleData).forEach(([code, details]) => {
            allItems.push({
                code: parseInt(code),
                name: details.name,
                image: details.image,
                type: 'obstacle',
                owned: userObstacles.has(parseInt(code))
            });
        });

        // Preload images with progress indication
        await preloadImages(allItems);
        
        setAnalyzeButtonLoading(false);
        displayResults();
        
    } catch (error) {
        console.error("Error parsing JSON:", error);
        setAnalyzeButtonLoading(false);
        
        if (error instanceof SyntaxError) {
            showError('Invalid JSON format. Please check your data and make sure it\'s properly formatted.');
        } else {
            showError('An error occurred while analyzing your data. Please try again.');
        }
    }
}

// Display results
function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const statsContainer = document.getElementById('statsContainer');
    
    if (!resultsSection || !statsContainer) {
        console.error('Results section elements not found');
        return;
    }
    
    resultsSection.style.display = 'block';
    
    // Filter items based on current type filter
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

// Search items
function searchItems() {
    applyFilters();
}

// Display items with optimized loading (images already preloaded)
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

        // Observe the image for lazy loading
        const imgEl = card.querySelector('img');
        if (imageObserver && imgEl) {
            imageObserver.observe(imgEl);
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
        });
    });

    return Promise.all(promises);
}

// Initialize everything when DOM is loaded
window.addEventListener('DOMContentLoaded', async () => {
    try {
        initImageObserver();
        
        // Load data with proper error handling
        await Promise.allSettled([loadDecorationData(), loadObstacleData()]);
        
        // Check if at least one dataset loaded successfully
        if (!Object.keys(decorationData).length && !Object.keys(obstacleData).length) {
            showError('Failed to load any data files. Please ensure finaldeco_updated.json and obstacles.json are available.');
        }
        
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Failed to initialize the application. Please refresh the page and try again.');
    }
});