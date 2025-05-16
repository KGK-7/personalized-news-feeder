document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const newsContainer = document.getElementById('newsContainer');
    const newsTemplate = document.getElementById('newsArticleTemplate');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const categoryButtonsContainer = document.querySelector('.category-buttons');
    const categoryTitle = document.getElementById('categoryTitle');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const voiceSearchBtn = document.getElementById('voiceSearchBtn');
    const readAloudBtn = document.getElementById('readAloudBtn');
    const loadingIndicator = document.getElementById('loading');
    const noNewsContainer = document.getElementById('noNews');
    const languageSelect = document.getElementById('language-select');
    const scrollbarThumb = document.querySelector('.scrollbar-thumb');
    
    // Speech Recognition and Speech Synthesis setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    const speechSynthesis = window.speechSynthesis;
    
    // Initialize custom scrollbar
    initCustomScrollbar();
    
    let recognition = null;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        // Handle speech recognition results
        recognition.onresult = function(event) {
            const speechResult = event.results[0][0].transcript;
            searchInput.value = speechResult;
            showVoiceFeedback(`Searching for: "${speechResult}"`, 2000);
            
            // Track the voice search in the database
            trackVoiceSearch(speechResult);
            
            // Perform the search
            searchNews(speechResult);
        };
        
        recognition.onstart = function() {
            voiceSearchBtn.classList.add('listening');
            showVoiceFeedback('Listening... Speak now', null);
        };
        
        recognition.onend = function() {
            voiceSearchBtn.classList.remove('listening');
            hideVoiceFeedback();
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            voiceSearchBtn.classList.remove('listening');
            showVoiceFeedback('Could not understand. Please try again.', 2000);
        };
        
        // Add click event for voice search button
        if (voiceSearchBtn) {
            voiceSearchBtn.addEventListener('click', function() {
                // Stop any ongoing speech
                if (isReading) {
                    stopSpeechSynthesis();
                }
                
                try {
                    // Set language based on current selection
                    recognition.lang = currentLanguage === 'ta' ? 'ta-IN' : 'en-US';
                    recognition.start();
                    showVoiceFeedback('Listening... Speak now', null);
                } catch (error) {
                    console.error('Speech recognition error:', error);
                    showVoiceFeedback('Speech recognition not available. Please type your search.', 3000);
                }
            });
        }
    } else {
        // If speech recognition is not supported
        if (voiceSearchBtn) {
            voiceSearchBtn.addEventListener('click', function() {
                showVoiceFeedback('Speech recognition is not supported in your browser.', 3000);
            });
        }
    }
    
    // Create voice feedback element
    const voiceFeedback = document.createElement('div');
    voiceFeedback.className = 'voice-feedback';
    document.body.appendChild(voiceFeedback);
    
    // Current state
    let currentCategory = 'general';
    let currentLanguage = 'en';
    let isReading = false;
    let currentUtterance = null;
    
    // Initialize - fetch default news
    fetchNews(currentCategory, currentLanguage);
    
    // Language selection event listener
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            const previousLanguage = currentLanguage;
            currentLanguage = this.value;
            console.log(`Language changed from ${previousLanguage} to ${currentLanguage}`);
            
            // Show feedback to user
            showLanguageChangeFeedback(currentLanguage);
            
            // Clear search input when changing language
            searchInput.value = '';
            
            // If Tamil language is selected, automatically switch to Tamil category
            if (currentLanguage === 'ta') {
                currentCategory = 'tamil';
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                const tamilBtn = document.querySelector('.category-btn[data-category="tamil"]');
                if (tamilBtn) tamilBtn.classList.add('active');
                categoryTitle.textContent = 'Tamil News';
                
                // Scroll to Tamil button
                scrollToButton(tamilBtn);
            } 
            // If switching from Tamil to English, set category to general
            else if (previousLanguage === 'ta') {
                currentCategory = 'general';
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                const generalBtn = document.querySelector('.category-btn[data-category="general"]');
                if (generalBtn) generalBtn.classList.add('active');
                categoryTitle.textContent = 'General News';
                
                // Scroll to General button
                scrollToButton(generalBtn);
            }
            
            // Clear previous content and fetch news with new language
            newsContainer.innerHTML = '';
            showLoading();
            fetchNews(currentCategory, currentLanguage);
        });
    }
    
    // Event Listeners
    
    // Category selection
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Update UI
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            categoryTitle.textContent = this.textContent;
            
            // If Tamil category is selected, set language to Tamil
            if (category === 'tamil') {
                if (languageSelect) {
                    languageSelect.value = 'ta';
                    currentLanguage = 'ta';
                }
            }
            
            // Scroll to center the selected button
            scrollToButton(this);
            
            // Fetch news for this category
            currentCategory = category;
            fetchNews(currentCategory, currentLanguage);
        });
    });
    
    // Function to scroll categories container to center a button
    function scrollToButton(button) {
        if (!button || !categoryButtonsContainer) return;
        
        const containerWidth = categoryButtonsContainer.offsetWidth;
        const buttonLeft = button.offsetLeft;
        const buttonWidth = button.offsetWidth;
        
        // Calculate the scroll position to center the button
        const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
        
        // Add click animation to the button
        button.classList.add('category-btn-click');
        setTimeout(() => {
            button.classList.remove('category-btn-click');
        }, 400);
        
        // Smooth scroll to the position
        categoryButtonsContainer.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    }
    
    // Custom scrollbar functionality
    function initCustomScrollbar() {
        if (!categoryButtonsContainer || !scrollbarThumb) return;
        
        // Update scrollbar on scroll event
        categoryButtonsContainer.addEventListener('scroll', updateScrollbarThumb);
        
        // Initial update
        updateScrollbarThumb();
        
        // Update on window resize
        window.addEventListener('resize', updateScrollbarThumb);
        
        // Make scrollbar interactive
        const scrollbarTrack = document.querySelector('.scrollbar-track');
        if (scrollbarTrack) {
            scrollbarTrack.addEventListener('click', function(e) {
                const trackRect = scrollbarTrack.getBoundingClientRect();
                const trackClickPosition = e.clientX - trackRect.left;
                const trackWidth = trackRect.width;
                const scrollWidth = categoryButtonsContainer.scrollWidth;
                const containerWidth = categoryButtonsContainer.clientWidth;
                
                // Calculate the new scroll position
                const scrollPercent = trackClickPosition / trackWidth;
                const newScrollPosition = scrollPercent * (scrollWidth - containerWidth);
                
                // Scroll to the new position
                categoryButtonsContainer.scrollTo({
                    left: newScrollPosition,
                    behavior: 'smooth'
                });
            });
        }
    }
    
    // Update scrollbar thumb position and width
    function updateScrollbarThumb() {
        if (!categoryButtonsContainer || !scrollbarThumb) return;
        
        const containerWidth = categoryButtonsContainer.clientWidth;
        const scrollWidth = categoryButtonsContainer.scrollWidth;
        
        // Calculate the size ratio of the thumb
        const ratio = containerWidth / scrollWidth;
        const thumbWidth = Math.max(ratio * 100, 10); // minimum 10% width
        
        // Calculate the position of the thumb
        const scrollPosition = categoryButtonsContainer.scrollLeft;
        const maxScroll = scrollWidth - containerWidth;
        const thumbPosition = maxScroll === 0 ? 0 : (scrollPosition / maxScroll) * (100 - thumbWidth);
        
        // Update thumb style with smooth transition
        scrollbarThumb.style.width = `${thumbWidth}%`;
        scrollbarThumb.style.left = `${thumbPosition}%`;
    }
    
    // Search functionality
    searchButton.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query) {
            searchNews(query);
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchNews(query);
            }
        }
    });
    
    // Read aloud functionality
    if (speechSynthesis) {
        readAloudBtn.addEventListener('click', function() {
            if (isReading) {
                stopSpeechSynthesis();
                readAloudBtn.innerHTML = '<i class="bi bi-volume-up"></i> Read Aloud';
            } else {
                // Check if current language is Tamil - if so, show message and return
                if (currentLanguage === 'ta' || currentCategory === 'tamil') {
                    // Show notification to user
                    const messageContainer = document.createElement('div');
                    messageContainer.className = 'alert alert-info text-center mt-2 mb-2';
                    messageContainer.innerHTML = '<strong>Tamil text-to-speech is disabled</strong><br>' +
                        'Text-to-speech is currently disabled for Tamil content.';
                        
                    // Add message to the page
                    const parentElement = newsContainer.parentElement;
                    if (parentElement) {
                        parentElement.insertBefore(messageContainer, newsContainer);
                        
                        // Remove the message after 5 seconds
                        setTimeout(() => messageContainer.remove(), 5000);
                    }
                    
                    return;
                }
                
                readAllNewsHeadlines();
                readAloudBtn.innerHTML = '<i class="bi bi-volume-mute"></i> Stop Reading';
                
                // Track this global read aloud action
                const firstArticle = document.querySelector('.news-card');
                if (firstArticle) {
                    const title = firstArticle.querySelector('.news-title')?.textContent || 'Headlines Summary';
                    const url = firstArticle.querySelector('.read-more')?.getAttribute('href') || '#';
                    const img = firstArticle.querySelector('.news-image')?.getAttribute('src') || '';
                    
                    fetch('/api/track_read_aloud', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: `All Headlines: ${title}`,
                            description: 'Multiple headlines read via main Read Aloud button',
                            url: url,
                            image_url: img,
                            category: currentCategory
                        })
                    }).catch(error => {
                        console.error('Error tracking read aloud:', error);
                    });
                }
            }
        });
    } else {
        readAloudBtn.style.display = 'none';
    }
    
    // Functions
    
    // Fetch news by category and language
    function fetchNews(category, language) {
        showLoading();
        
        let url = `/get_news?category=${category}&language=${language}`;
        console.log(`Fetching news from: ${url}`);
        
        // Set a timeout for the fetch to handle hanging requests
        const fetchPromise = fetch(url);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timed out')), 15000); // 15 second timeout
        });
        
        Promise.race([fetchPromise, timeoutPromise])
            .then(response => {
                console.log(`Response status: ${response.status}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`Received ${data.articles ? data.articles.length : 0} articles`);
                hideLoading();
                
                // Handle empty data
                if (!data || !data.articles || data.articles.length === 0) {
                    console.log("No articles found in data");
                    showNoNews();
                    return;
                }
                
                // Reset container and show content
                newsContainer.innerHTML = '';
                renderNews(data);
            })
            .catch(error => {
                console.error('Error fetching news:', error);
                hideLoading();
                
                // Show more descriptive error message
                newsContainer.innerHTML = '';
                noNewsContainer.classList.remove('d-none');
                noNewsContainer.innerHTML = '<div class="alert alert-danger text-center">' +
                    '<h4>Could not load news</h4>' +
                    `<p>There was a problem loading the news: ${error.message}.</p>` +
                    '<p>Please try refreshing the page or selecting a different category.</p>' +
                    '<button class="btn btn-primary mt-2" onclick="window.location.reload()">Refresh Page</button>' +
                    '</div>';
            });
    }
    
    // Search news by query
    function searchNews(query) {
        showLoading();
        categoryTitle.textContent = `Search Results: "${query}"`;
        
        // Reset category buttons
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        
        // Include current language in search
        console.log(`Searching for "${query}" with language: ${currentLanguage}`);
        
        // Reset news container before searching
        newsContainer.innerHTML = '';
        
        fetch(`/api/search_news?q=${encodeURIComponent(query)}&language=${currentLanguage}`)
            .then(response => {
                console.log(`Search response status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log(`Received ${data.articles ? data.articles.length : 0} search results`);
                hideLoading();
                renderNews(data);
            })
            .catch(error => {
                console.error('Error searching news:', error);
                hideLoading();
                showNoNews();
            });
    }
    
    // Render news articles
    function renderNews(data) {
        // Clear loading indicator and existing news
        hideLoading();
        newsContainer.innerHTML = '';
        
        // Check if there are any news articles
        if (!data || !data.articles || data.articles.length === 0) {
            showNoNews();
            return;
        }
        
        const articles = data.articles;
        console.log(`Rendering ${articles.length} news articles`);
        
        // Hide "no news" message if previously shown
        noNewsContainer.classList.add('d-none');
        
        // Loop through each article and create HTML elements
        articles.forEach((article, index) => {
            if (!article.title) return; // Skip articles without titles
            
            // Clone the template
            const template = newsTemplate.content.cloneNode(true);
            const newsCard = template.querySelector('.news-card');
            
            // Set article image
            const img = template.querySelector('.news-image');
            if (article.image) {
                img.src = article.image;
            } else {
                img.src = 'https://via.placeholder.com/300x200?text=No+Image';
            }
            img.alt = article.title;
            
            // Add category label
            const categoryLabel = template.querySelector('.category-label');
            if (categoryLabel) {
                categoryLabel.textContent = currentCategory.toUpperCase();
                
                // Set color based on category
                let categoryColor = 'rgba(26, 115, 232, 0.85)'; // default blue
                
                switch(currentCategory) {
                    case 'business':
                        categoryColor = 'rgba(0, 150, 136, 0.85)'; // teal
                        break;
                    case 'technology':
                        categoryColor = 'rgba(63, 81, 181, 0.85)'; // indigo
                        break;
                    case 'entertainment':
                        categoryColor = 'rgba(156, 39, 176, 0.85)'; // purple
                        break;
                    case 'sports':
                        categoryColor = 'rgba(244, 67, 54, 0.85)'; // red
                        break;
                    case 'science':
                        categoryColor = 'rgba(0, 188, 212, 0.85)'; // cyan
                        break;
                    case 'health':
                        categoryColor = 'rgba(76, 175, 80, 0.85)'; // green
                        break;
                    case 'world':
                        categoryColor = 'rgba(33, 150, 243, 0.85)'; // blue
                        break;
                    case 'nation':
                        categoryColor = 'rgba(255, 152, 0, 0.85)'; // orange
                        break;
                    case 'tamil':
                        categoryColor = 'rgba(121, 85, 72, 0.85)'; // brown
                        break;
                }
                
                categoryLabel.style.backgroundColor = categoryColor;
            }
            
            // Set article title and content
            template.querySelector('.news-title').textContent = article.title;
            
            // Set description with fallbacks
            let description = article.description || article.content || '';
            // Trim description if too long
            if (description.length > 150) {
                description = description.substring(0, 147) + '...';
            }
            template.querySelector('.news-description').textContent = description;
            
            // Set "Read More" link
            const readMoreLink = template.querySelector('.read-more');
            readMoreLink.href = article.url;
            readMoreLink.target = '_blank';
            readMoreLink.rel = 'noopener noreferrer';
            
            // Track outbound clicks
            readMoreLink.addEventListener('click', function(e) {
                // Prevent the default action so we can track it first
                e.preventDefault();
                
                const clickData = {
                    url: article.url,
                    title: article.title,
                    language: currentLanguage
                };
                
                // Log the click via AJAX
                fetch('/api/track_click', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(clickData)
                })
                .then(response => {
                    console.log('Click tracked successfully');
                    // After tracking, open the link
                    window.open(article.url, '_blank', 'noopener,noreferrer');
                })
                .catch(error => {
                    console.error('Error tracking click:', error);
                    // Open the link anyway if tracking fails
                    window.open(article.url, '_blank', 'noopener,noreferrer');
                });
            });
            
            // Set up Read Aloud button
            const readArticleBtn = template.querySelector('.read-article');
            if (readArticleBtn) {
                readArticleBtn.addEventListener('click', function() {
                    // Stop any current speech
                    stopSpeechSynthesis();
                    
                    // Get the article content to read
                    const title = article.title;
                    let content = article.description || article.content || '';
                    
                    // Combine title and description for a better reading experience
                    const textToRead = `${title}. ${content}`;
                    
                    // Read the article
                    readTextAloud(textToRead);
                    
                    // Track the read aloud action via AJAX
                    fetch('/api/track_read_aloud', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: article.title,
                            url: article.url,
                            description: content,
                            category: currentCategory,
                            image_url: article.image
                        })
                    })
                    .then(response => {
                        console.log('Read aloud action tracked');
                    })
                    .catch(error => {
                        console.error('Error tracking read aloud:', error);
                    });
                });
            }
            
            // Set up Share button
            const shareArticleBtn = template.querySelector('.share-article');
            if (shareArticleBtn) {
                shareArticleBtn.addEventListener('click', function() {
                    // Share the article
                    shareArticle(article.title, article.url, article.description);
                });
            }
            
            // Set source information with enhanced formatting
            const sourceElement = template.querySelector('.news-source');
            let sourceHTML = '';
            
            if (article.source && article.source.name) {
                sourceHTML += `<span class="source-name">${article.source.name}</span>`;
            }
            
            // Add published date if available
            if (article.publishedAt) {
                try {
                    const date = new Date(article.publishedAt);
                    const formattedDate = date.toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                    
                    // Get time ago
                    const timeAgo = getTimeAgo(date);
                    
                    sourceHTML += `<span class="published-date">${timeAgo}</span>`;
                } catch (e) {
                    console.error('Error formatting date', e);
                }
            }
            
            if (sourceHTML) {
                sourceElement.innerHTML = sourceHTML;
            } else {
                sourceElement.style.display = 'none';
            }
            
            // Add the article to the container
            newsContainer.appendChild(template);
        });
    }
    
    // Helper function to get time ago string
    function getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
        }
        
        // If older than a week, just return the date
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Voice feedback display
    function showVoiceFeedback(message, duration) {
        if (!voiceFeedback) return;
        
        voiceFeedback.textContent = message;
        voiceFeedback.style.display = 'block';
        
        // Add listening animation if it's a listening message
        if (message.toLowerCase().includes('listening')) {
            voiceFeedback.classList.add('listening');
        } else {
            voiceFeedback.classList.remove('listening');
        }
        
        // Hide after duration if specified
        if (duration) {
            setTimeout(hideVoiceFeedback, duration);
        }
    }
    
    function hideVoiceFeedback() {
        if (voiceFeedback) {
            voiceFeedback.style.display = 'none';
            voiceFeedback.classList.remove('listening');
        }
    }
    
    // Read text aloud with enhanced naturalness
    function readTextAloud(text, options = {}) {
        // Stop any current speech
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        // Skip empty text
        if (!text || text.trim() === '') {
            console.log('No text to read');
            return;
        }
        
        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        currentUtterance = utterance;
        
        // Set language based on current language or options
        utterance.lang = options.lang || (currentLanguage === 'ta' ? 'ta-IN' : 'en-US');
        
        // Apply voice settings for more natural speech
        utterance.rate = options.rate || (currentLanguage === 'ta' ? 0.9 : 0.95); // Slightly slower for more natural speech
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Add pauses for more natural reading using SSML-like approach with plain text
        // We'll add brief pauses after sentences and longer pauses after paragraphs
        if (!options.skipFormatting) {
            text = formatTextForNaturalReading(text);
            utterance.text = text;
        }
        
        // Set the voice based on language
        setVoice(utterance);
        
        // Add event handlers
        utterance.onstart = function() {
            isReading = true;
            console.log('Started reading: ' + text.substring(0, 50) + '...');
            
            // Visual feedback that reading is happening
            if (options.articleElement) {
                options.articleElement.classList.add('being-read');
            }
            
            if (readAloudBtn) {
                readAloudBtn.innerHTML = '<i class="bi bi-volume-up-fill"></i> Stop Reading';
                readAloudBtn.classList.add('reading');
            }
        };
        
        utterance.onend = function() {
            isReading = false;
            console.log('Finished reading.');
            
            // Remove visual feedback
            if (options.articleElement) {
                options.articleElement.classList.remove('being-read');
            }
            
            if (readAloudBtn && !options.keepButtonState) {
                readAloudBtn.innerHTML = '<i class="bi bi-volume-up"></i> Read Aloud';
                readAloudBtn.classList.remove('reading');
            }
            
            // Execute callback if provided
            if (typeof options.onEnd === 'function') {
                options.onEnd();
            }
        };
        
        utterance.onerror = function(event) {
            console.error('Speech synthesis error:', event);
            isReading = false;
            
            // Remove visual feedback
            if (options.articleElement) {
                options.articleElement.classList.remove('being-read');
            }
            
            if (readAloudBtn && !options.keepButtonState) {
                readAloudBtn.innerHTML = '<i class="bi bi-volume-up"></i> Read Aloud';
                readAloudBtn.classList.remove('reading');
            }
        };
        
        // Speak the text
        speechSynthesis.speak(utterance);
        
        return utterance;
        
        /**
         * Set the appropriate voice for the utterance
         * @param {SpeechSynthesisUtterance} utterance - The utterance to set voice for
         */
        function setVoice(utterance) {
            // Get available voices
            let voices = speechSynthesis.getVoices();
            
            // If voices aren't loaded yet, wait for them
            if (voices.length === 0) {
                speechSynthesis.onvoiceschanged = function() {
                    voices = speechSynthesis.getVoices();
                    setVoiceFromAvailable(voices, utterance);
                };
            } else {
                setVoiceFromAvailable(voices, utterance);
            }
        }
        
        /**
         * Select the best voice from available voices
         * @param {Array} voices - Available voices
         * @param {SpeechSynthesisUtterance} utterance - The utterance to set voice for
         */
        function setVoiceFromAvailable(voices, utterance) {
            console.log(`Setting voice for language: ${utterance.lang}`);
            
            let selectedVoice = null;
            
            // Priority order for voice selection:
            // 1. Premium/enhanced neural voices that match the language
            // 2. Native voices that match the language
            // 3. Any voice that matches the language
            // 4. Default system voice
            
            // Get language code (e.g., 'en-US' -> 'en')
            const langBase = utterance.lang.split('-')[0].toLowerCase();
            
            // First try to find premium/enhanced voices
            const premiumVoices = voices.filter(voice => 
                (voice.name.includes('Premium') || 
                 voice.name.includes('Enhanced') || 
                 voice.name.includes('Neural') ||
                 voice.name.includes('Google') ||
                 voice.name.includes('Natural')) && 
                voice.lang.toLowerCase().includes(langBase)
            );
            
            if (premiumVoices.length > 0) {
                // Prefer female voice for news reading
                const femaleVoice = premiumVoices.find(voice => 
                    voice.name.includes('Female') || 
                    voice.name.includes('Lisa') || 
                    voice.name.includes('Samantha') ||
                    voice.name.includes('Siri')
                );
                
                selectedVoice = femaleVoice || premiumVoices[0];
                console.log(`Selected premium voice: ${selectedVoice.name}`);
            } else {
                // Try to find a native voice for the language
                const nativeVoices = voices.filter(voice => 
                    voice.lang.toLowerCase().startsWith(langBase) &&
                    !voice.name.includes('Microsoft')
                );
                
                if (nativeVoices.length > 0) {
                    // Prefer female voice
                    const femaleVoice = nativeVoices.find(voice => 
                        voice.name.includes('Female') || 
                        !voice.name.includes('Male')
                    );
                    
                    selectedVoice = femaleVoice || nativeVoices[0];
                    console.log(`Selected native voice: ${selectedVoice.name}`);
                } else {
                    // Last resort - any voice for the language
                    const anyMatchingVoice = voices.find(voice => 
                        voice.lang.toLowerCase().startsWith(langBase)
                    );
                    
                    if (anyMatchingVoice) {
                        selectedVoice = anyMatchingVoice;
                        console.log(`Selected compatible voice: ${selectedVoice.name}`);
                    } else {
                        // Fallback to default voice
                        console.log('No matching voice found, using default voice');
                    }
                }
            }
            
            // Set the selected voice
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
            // Special adjustments for Tamil
            if (langBase === 'ta') {
                utterance.rate = 0.9; // Slower rate for Tamil
                utterance.pitch = 1.0;
            }
        }
    }
    
    /**
     * Format text to make speech sound more natural with appropriate pauses
     * @param {string} text - The text to format
     * @returns {string} - Formatted text
     */
    function formatTextForNaturalReading(text) {
        if (!text) return text;
        
        // Replace abbreviations and numbers with expanded versions for better pronunciation
        text = text
            .replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1 $2') // Add space in ordinals (1st -> 1 st)
            .replace(/\b(\d{4})\b/g, '$1 ') // Add space after years (2023 -> 2023 )
            .replace(/\b([A-Z]{2,})\b/g, function(match) { // Space out acronyms (USA -> U S A)
                return match.split('').join(' ');
            })
            .replace(/([.!?])\s+/g, '$1. ') // Add extra pause after sentences
            .replace(/([,:;])\s+/g, '$1 ') // Add slight pause after commas, colons, etc.
            .replace(/\n+/g, '. ') // Replace newlines with pauses
            .replace(/\s{2,}/g, ' '); // Remove extra spaces
            
        return text;
    }
    
    // Read all news headlines
    function readAllNewsHeadlines() {
        const headlines = [];
        const articles = [];
        
        // Check if current language is Tamil - if so, show message and return
        if (currentLanguage === 'ta' || currentCategory === 'tamil') {
            // Show notification to user
            const messageContainer = document.createElement('div');
            messageContainer.className = 'alert alert-info text-center mt-2 mb-2';
            messageContainer.innerHTML = '<strong>Tamil text-to-speech is disabled</strong><br>' +
                'Text-to-speech is currently disabled for Tamil content.';
                
            // Add message to the page
            const parentElement = newsContainer.parentElement;
            if (parentElement) {
                parentElement.insertBefore(messageContainer, newsContainer);
                
                // Remove the message after 5 seconds
                setTimeout(() => messageContainer.remove(), 5000);
            }
            
            return;
        }
        
        document.querySelectorAll('.news-card').forEach(card => {
            const title = card.querySelector('.news-title').textContent;
            const description = card.querySelector('.news-description') ? 
                               card.querySelector('.news-description').textContent : '';
            const url = card.querySelector('.read-more') ? 
                       card.querySelector('.read-more').getAttribute('href') : '#';
            const img = card.querySelector('.news-image') ? 
                       card.querySelector('.news-image').getAttribute('src') : '';
            
            headlines.push(title);
            articles.push({ title, description, url, image_url: img });
        });
        
        if (headlines.length > 0) {
            // Track the first article as being read with Read Aloud
            if (articles.length > 0) {
                fetch('/api/track_read_aloud', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: `Headlines Summary: ${articles[0].title}`,
                        description: 'Multiple headlines read via Read Aloud feature',
                        url: articles[0].url,
                        image_url: articles[0].image_url,
                        category: currentCategory
                    })
                }).catch(error => {
                    console.error('Error tracking read aloud headlines:', error);
                });
            }
            
            // COMPLETELY NEW IMPLEMENTATION - Simple and reliable
            // This will read one headline at a time to improve reliability
            
            // Set initial state
            isReading = true;
            readAloudBtn.innerHTML = '<i class="bi bi-volume-mute"></i> Stop Reading';
            
            // Cancel any existing speech
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            
            // Improved notification for tracking progress
            const statusMessage = document.createElement('div');
            statusMessage.className = 'alert alert-info text-center mt-2 mb-2 speech-status';
            statusMessage.innerHTML = '<strong>Reading Headlines</strong><br>Starting to read...';
            document.querySelectorAll('.speech-status').forEach(el => el.remove()); // Remove any existing
            
            const parentElement = newsContainer.parentElement;
            if (parentElement) {
                parentElement.insertBefore(statusMessage, newsContainer);
            }
            
            // Create introduction first
            let currentIndex = 0;
            let introSpoken = false;
            
            function readNextHeadline() {
                // If stopped or all headlines read
                if (!isReading || currentIndex >= headlines.length) {
                    // Clean up
                    isReading = false;
                    readAloudBtn.innerHTML = '<i class="bi bi-volume-up"></i> Read Aloud';
                    if (statusMessage) {
                        statusMessage.innerHTML = '<strong>Reading Complete</strong><br>Finished reading all headlines.';
                        setTimeout(() => {
                            statusMessage.remove();
                        }, 3000);
                    }
                    return;
                }
                
                // Create utterance for either intro or current headline
                let text;
                if (!introSpoken) {
                    text = "Here are the latest headlines:";
                    introSpoken = true;
                } else {
                    // Update status message
                    if (statusMessage) {
                        statusMessage.innerHTML = `<strong>Reading Headlines</strong><br>Reading headline ${currentIndex+1} of ${headlines.length}`;
                    }
                    
                    // Get the headline text
                    text = headlines[currentIndex];
                    currentIndex++;
                }
                
                // Create a new utterance for this piece
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Configure voice settings
                utterance.volume = 1;
                utterance.rate = 0.92;   // Slightly slower for clarity
                utterance.pitch = 1.05;  // Natural pitch
                utterance.lang = 'en-GB';
                
                // Select the best available voice
                const voices = speechSynthesis.getVoices();
                let voiceFound = false;
                
                // Try English voices in order of preference
                const voicePreferences = [
                    // First try enhanced/premium British/Indian English voices
                    voice => (voice.lang === 'en-GB' || voice.lang === 'en-IN') && 
                             (voice.name.includes('Premium') || voice.name.includes('Enhanced') || 
                              voice.name.includes('Neural') || voice.name.includes('Female')),
                    
                    // Then any British/Indian voice
                    voice => voice.lang === 'en-GB' || voice.lang === 'en-IN',
                    
                    // Then enhanced/premium voices in any English
                    voice => voice.lang.startsWith('en') && 
                             (voice.name.includes('Premium') || voice.name.includes('Enhanced') || 
                              voice.name.includes('Neural')),
                    
                    // Then any English voice
                    voice => voice.lang.startsWith('en'),
                    
                    // Finally, any voice as fallback
                    voice => true
                ];
                
                // Try each voice preference in order
                for (const preference of voicePreferences) {
                    const preferredVoice = voices.find(preference);
                    if (preferredVoice) {
                        utterance.voice = preferredVoice;
                        voiceFound = true;
                        console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang})`);
                        break;
                    }
                }
                
                // When this piece finishes, read the next one
                utterance.onend = function() {
                    console.log(`Finished reading: ${text}`);
                    // Short timeout before next piece to prevent browser issues
                    setTimeout(readNextHeadline, 100);
                };
                
                // Handle errors
                utterance.onerror = function(event) {
                    console.error(`Speech error: ${event.error}`);
                    // Try to continue anyway after a delay
                    setTimeout(readNextHeadline, 500);
                };
                
                // Start speaking
                console.log(`Speaking: ${text}`);
                speechSynthesis.speak(utterance);
            }
            
            // Start the process
            readNextHeadline();
        }
    }
    
    // Stop speech synthesis
    function stopSpeechSynthesis() {
        if (speechSynthesis) {
            speechSynthesis.cancel();
            isReading = false;
            
            // Reset UI
            if (readAloudBtn) {
                readAloudBtn.innerHTML = '<i class="bi bi-volume-up"></i> Read Aloud';
                readAloudBtn.classList.remove('reading');
            }
            
            // Remove 'being-read' class from all articles
            const allArticles = document.querySelectorAll('.news-card');
            allArticles.forEach(article => {
                article.classList.remove('being-read');
            });
            
            console.log('Speech synthesis stopped');
        }
    }
    
    // Show/hide loading and no news indicators
    function showLoading() {
        loadingIndicator.style.display = 'block';
        newsContainer.innerHTML = '';
        noNewsContainer.classList.add('d-none');
    }
    
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }
    
    function showNoNews() {
        newsContainer.innerHTML = '';
        noNewsContainer.classList.remove('d-none');
        noNewsContainer.innerHTML = '<div class="alert alert-info text-center">' +
            '<h4>No articles found</h4>' +
            '<p>Try a different category, language, or check back later.</p>' +
            '</div>';
    }
    
    // Show language change feedback
    function showLanguageChangeFeedback(language) {
        const languages = {
            'en': 'English',
            'ta': 'Tamil'
        };
        
        const langName = languages[language] || language;
        
        // Create notification if doesn't exist
        let notification = document.querySelector('.language-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'language-notification alert alert-info';
            notification.style.position = 'fixed';
            notification.style.top = '10px';
            notification.style.right = '10px';
            notification.style.zIndex = '1000';
            notification.style.padding = '10px 15px';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            document.body.appendChild(notification);
        }
        
        notification.textContent = `Switching to ${langName}...`;
        notification.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Improved share article function
    function shareArticle(title, url, description) {
        // Check if Web Share API is available
        if (navigator.share) {
            navigator.share({
                title: title,
                text: description || title,
                url: url
            })
            .then(() => {
                console.log('Article shared successfully');
                showVoiceFeedback('Article shared successfully', 2000);
            })
            .catch((error) => {
                console.error('Error sharing article:', error);
                fallbackShare(title, url);
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            fallbackShare(title, url);
        }
    }

    // Improved fallback share function
    function fallbackShare(title, url) {
        // Create a temporary input element
        const input = document.createElement('input');
        input.setAttribute('value', url);
        document.body.appendChild(input);
        input.select();
        
        // Try to copy the URL to clipboard
        try {
            document.execCommand('copy');
            showVoiceFeedback('Link copied to clipboard', 2000);
        } catch (err) {
            console.error('Could not copy text: ', err);
            showVoiceFeedback('Could not copy link', 2000);
        }
        
        // Remove the temporary input element
        document.body.removeChild(input);
        
        // Show sharing modal or options as needed
        const shareText = `Share: ${title}\n${url}`;
        alert(shareText);
    }

    // Event delegation for footer category links
    document.addEventListener('click', function(e) {
        // Check if the clicked element is a footer category link
        if (e.target.closest('.footer-links a[data-category]')) {
            const link = e.target.closest('.footer-links a[data-category]');
            const category = link.dataset.category;
            e.preventDefault();
            
            // Update the active category button
            const categoryBtn = document.querySelector(`.category-btn[data-category="${category}"]`);
            if (categoryBtn) {
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                categoryBtn.classList.add('active');
                categoryTitle.textContent = categoryBtn.textContent;
                
                // Scroll to center the selected button
                scrollToButton(categoryBtn);
                
                // Fetch news for this category
                currentCategory = category;
                fetchNews(currentCategory, currentLanguage);
                
                // Scroll to top of content
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }
    });

    /**
     * Track voice search in the database
     * @param {string} query - The search query
     */
    function trackVoiceSearch(query) {
        // Check if user is logged in (session exists)
        if (!query) return;
        
        const data = {
            query: query,
            language: currentLanguage
        };
        
        // Send to server
        fetch('/api/track_voice_search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Voice search tracked:', data);
        })
        .catch(error => {
            console.error('Error tracking voice search:', error);
        });
    }
});