let decorationData = {};
let userDecorations = new Set();
let allDecorations = [];
let currentFilter = 'all';
let imageObserver;

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
                        img.style.display = 'none';
                        img.parentElement.innerHTML = '✨';
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
        const jsonData = await response.json();
        
        decorationData = {};
        jsonData.forEach(item => {
            decorationData[item.Code] = {
                name: item.name,
                image: item.image
            };
        });
        
        console.log(`Loaded ${Object.keys(decorationData).length} decorations`);
    } catch (error) {
        console.error('Error loading decoration data:', error);
        document.getElementById('errorMessage').innerHTML = 
            '<div class="error-message">Failed to load decoration data. Please ensure finaldeco_updated.json is available.</div>';
    }
}

// Extract decoration codes from JSON
function extractCodesFromJSON(obj, codes = new Set()) {
    if (!obj || typeof obj !== 'object') return codes;
    
    if (Array.isArray(obj)) {
        obj.forEach(item => extractCodesFromJSON(item, codes));
    } else {
        if (obj.data && typeof obj.data === 'number' && decorationData[obj.data]) {
            codes.add(obj.data);
        }
        Object.values(obj).forEach(val => {
            if (typeof val === 'object') extractCodesFromJSON(val, codes);
        });
    }
    return codes;
}

// Analyze decorations
function analyzeDecorations() {
    const jsonInput = document.getElementById('jsonInput').value.trim();
    const errorDiv = document.getElementById('errorMessage');
    
    errorDiv.innerHTML = '';
    document.getElementById('resultsSection').style.display = 'none';

    if (!Object.keys(decorationData).length) {
        errorDiv.innerHTML = '<div class="error-message">Decoration data is still loading. Please wait.</div>';
        return;
    }

    if (!jsonInput) {
        errorDiv.innerHTML = '<div class="error-message">Please paste your JSON data first!</div>';
        return;
    }

    try {
        const parsedJson = JSON.parse(jsonInput);
        userDecorations = extractCodesFromJSON(parsedJson);
        
        allDecorations = Object.entries(decorationData).map(([code, details]) => ({
            code: parseInt(code),
            name: details.name,
            image: details.image,
            owned: userDecorations.has(parseInt(code))
        }));

        displayResults();
    } catch (error) {
        console.error("Error parsing JSON:", error);
        errorDiv.innerHTML = '<div class="error-message">Invalid JSON format. Please check your data.</div>';
    }
}

// Display results
function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const statsContainer = document.getElementById('statsContainer');
    
    resultsSection.style.display = 'block';
    
    const owned = allDecorations.filter(d => d.owned).length;
    const total = allDecorations.length;
    const missing = total - owned;
    const percentage = total ? Math.round((owned / total) * 100) : 0;
    
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
            <div class="stat-label">Total</div>
        </div>
    `;
    
    filterDecorations('all');
}

// Filter decorations
function filterDecorations(filter, event) {
    currentFilter = filter;
    
    if (event) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
    
    let filtered = [...allDecorations];
    
    if (filter === 'owned') filtered = filtered.filter(d => d.owned);
    else if (filter === 'missing') filtered = filtered.filter(d => !d.owned);
    
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(d => 
            d.name.toLowerCase().includes(searchTerm) || 
            d.code.toString().includes(searchTerm)
        );
    }
    
    displayDecorations(filtered);
}

// Search decorations
function searchDecorations() {
    filterDecorations(currentFilter);
}

// Display decorations with lazy loading
function displayDecorations(decorations) {
    const grid = document.getElementById('decorationsGrid');
    grid.innerHTML = '';

    if (!decorations.length) {
        grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px; grid-column: 1/-1;">No decorations found.</p>';
        return;
    }

    // Create cards in batches for better performance
    const fragment = document.createDocumentFragment();
    
    decorations.forEach(decoration => {
        const card = document.createElement('div');
        card.className = `decoration-card ${decoration.owned ? 'owned' : 'missing'}`;
        
        const imageHtml = decoration.image 
            ? `<img class="decoration-image" data-src="${decoration.image}" alt="${decoration.name}" loading="lazy">`
            : `<div class="decoration-image loaded">✨</div>`;
        
        card.innerHTML = `
            ${imageHtml}
            <div class="decoration-name">${decoration.name}</div>
            <div class="decoration-code">ID: ${decoration.code}</div>
            <span class="status-indicator ${decoration.owned ? 'status-owned' : 'status-missing'}">
                ${decoration.owned ? 'Owned' : 'Missing'}
            </span>
        `;
        
        fragment.appendChild(card);
    });
    
    grid.appendChild(fragment);
    
    // Observe images for lazy loading
    if (imageObserver) {
        grid.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initImageObserver();
    loadDecorationData();
});