
        let decorationData = {}; // Will be loaded from JSON file
        let userDecorations = new Set();
        let allDecorations = []; 
        let currentFilter = 'all'; 

        // Load decoration data from JSON file
        async function loadDecorationData() {
            try {
                const response = await fetch('finaldeco_updated.json');
                const jsonData = await response.json();
                
                // Convert the JSON array to the expected format
                decorationData = {};
                jsonData.forEach(item => {
                    decorationData[item.Code] = {
                        name: item.Name,
                        image: `images/decorations/decoration_${item.Code.slice(2)}.png` // Generic image path
                    };
                });
                
                console.log(`Loaded ${Object.keys(decorationData).length} decorations from JSON file`);
            } catch (error) {
                console.error('Error loading decoration data:', error);
                // Fallback error message
                document.getElementById('errorMessage').innerHTML = 
                    '<div class="error-message">Failed to load decoration data. Please ensure finaldeco_updated.json is in the same directory.</div>';
            }
        }

        // Refined function to extract 'data' codes that are decoration IDs
        function extractCodesFromJSON(obj, codes = new Set()) {
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    // If it's an array, iterate through its elements
                    obj.forEach(item => extractCodesFromJSON(item, codes));
                } else {
                    // If it's an object, check for a 'data' property
                    if (obj.hasOwnProperty('data') && typeof obj.data === 'number') {
                        // Only add to the set if it's a known decoration ID
                        if (decorationData[obj.data]) {
                            codes.add(obj.data);
                        }
                    }

                    // Recursively go through all other properties of the object
                    for (const key in obj) {
                        // Avoid infinite loops for self-referencing objects, though unlikely in CoC JSON
                        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
                            extractCodesFromJSON(obj[key], codes);
                        }
                    }
                }
            }
            return codes;
        }

        function analyzeDecorations() {
            const jsonInput = document.getElementById('jsonInput').value.trim();
            const errorDiv = document.getElementById('errorMessage');
            
            errorDiv.innerHTML = ''; 
            document.getElementById('resultsSection').style.display = 'none';

            // Check if decoration data is loaded
            if (Object.keys(decorationData).length === 0) {
                errorDiv.innerHTML = '<div class="error-message">Decoration data is still loading. Please wait and try again.</div>';
                return;
            }

            if (!jsonInput) {
                errorDiv.innerHTML = '<div class="error-message">Please paste your JSON data first!</div>';
                return;
            }

            try {
                const parsedJson = JSON.parse(jsonInput);
                
                // Extract decoration codes owned by the user using the refined function
                userDecorations = extractCodesFromJSON(parsedJson);
                
                // Populate allDecorations array based on the master decorationData list
                // and mark them as owned or missing
                allDecorations = Object.entries(decorationData).map(([codeStr, details]) => {
                    const code = parseInt(codeStr);
                    return {
                        code: code,
                        name: details.name,
                        image: details.image,
                        owned: userDecorations.has(code)
                    };
                });

                displayResults();
                
            } catch (error) {
                console.error("Error parsing JSON:", error);
                errorDiv.innerHTML = '<div class="error-message">Invalid JSON format. Please check your data and try again.</div>';
            }
        }

        function displayResults() {
            const resultsSection = document.getElementById('resultsSection');
            const statsContainer = document.getElementById('statsContainer');
            
            resultsSection.style.display = 'block'; 
            
            const ownedCount = allDecorations.filter(d => d.owned).length;
            const totalCount = allDecorations.length;
            const missingCount = totalCount - ownedCount;
            const percentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${ownedCount}</div>
                    <div class="stat-label">Owned Decorations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${missingCount}</div>
                    <div class="stat-label">Missing Decorations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${percentage}%</div>
                    <div class="stat-label">Collection Complete</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalCount}</div>
                    <div class="stat-label">Total Decorations</div>
                </div>
            `;
            
            // Set 'all' filter as active initially and display all decorations
            filterDecorations('all', null); // Pass null for event to avoid errors
            document.querySelector('.filter-btn.active')?.classList.remove('active'); // Use optional chaining to prevent error if not found
            document.querySelector('[onclick="filterDecorations(\'all\', event)"]').classList.add('active'); 
        }

        function filterDecorations(filter, event) {
            currentFilter = filter;
            
            // Update active button only if event is provided (i.e., clicked by user)
            if (event) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
            }
            
            let filtered = [...allDecorations]; 

            switch (filter) {
                case 'owned':
                    filtered = filtered.filter(d => d.owned);
                    break;
                case 'missing':
                    filtered = filtered.filter(d => !d.owned);
                    break;
                default:
                    break;
            }
            
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            if (searchTerm) {
                filtered = filtered.filter(d => 
                    d.name.toLowerCase().includes(searchTerm) ||
                    d.code.toString().includes(searchTerm)
                );
            }
            
            displayDecorations(filtered); 
        }

        function searchDecorations() {
            filterDecorations(currentFilter, null); 
        }

        function displayDecorations(decorationsToDisplay) {
            const decorationsGrid = document.getElementById('decorationsGrid');
            decorationsGrid.innerHTML = ''; 

            if (decorationsToDisplay.length === 0) {
                decorationsGrid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No decorations found matching your criteria.</p>';
                return;
            }

            decorationsToDisplay.forEach(decoration => {
                const card = document.createElement('div');
                card.classList.add('decoration-card');
                card.classList.add(decoration.owned ? 'owned' : 'missing');

                let imageHtml = '';
                if (decoration.image) {
                    imageHtml = `<img src="${decoration.image}" alt="${decoration.name}" class="decoration-image">`;
                } else {
                    // Fallback if image path is missing or empty
                    imageHtml = `<div class="decoration-image" style="background-color: #f0f0f0;">✨</div>`; // A generic icon or placeholder
                }

                card.innerHTML = `
                    ${imageHtml}
                    <div class="decoration-name">${decoration.name}</div>
                    <div class="decoration-code">ID: ${decoration.code}</div>
                    <span class="status-indicator ${decoration.owned ? 'status-owned' : 'status-missing'}">
                        ${decoration.owned ? 'Owned' : 'Missing'}
                    </span>
                `;
                decorationsGrid.appendChild(card);
            });
        }

        // Initialize the app
        window.addEventListener('DOMContentLoaded', loadDecorationData);