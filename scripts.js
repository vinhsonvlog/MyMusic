document.addEventListener('DOMContentLoaded', async function() {
    // Tạo hiệu ứng particles cho ngân hà
    createGalaxyParticles();
    
    // Thêm hiệu ứng hover cho cards
    addCardInteractions();
    
    // Khởi tạo music player
    initMusicPlayer();
    
    // Tạo search section nếu chưa có
    createSearchSection();
    
    // Tìm kiếm mặc định với loading
    showLoadingState();
    const defaultTracks = await searchYouTubeMusic('vietnamese pop songs 2024');
    displayTracks(defaultTracks);
    
    // Thiết lập event listeners
    setupEventListeners();
});

const YOUTUBE_API_KEY = 'AIzaSyB8lwF8mQgOxZWGanPg680CgzfPkTOuDl4';

let currentSongs = [];
let currentSongIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let isMuted = false;
let previousVolume = 50;
let loadingTimeout = null;
let currentVideoDuration = 0;

// Khởi tạo music player với preloading
function initMusicPlayer() {
    // Preload YouTube iframe API
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}

// Hiển thị trạng thái loading với countdown
function showLoadingState() {
    const musicCards = document.getElementById('musicCards');
    musicCards.innerHTML = `
        <div class="loading-enhanced">
            <div class="loading-spinner"></div>
            <h3>🎵 Đang tải nhạc...</h3>
            <p>Chờ chút nhé, YouTube đang chuẩn bị những bài hát hay nhất!</p>
            <div class="loading-progress">
                <div class="progress-line"></div>
            </div>
            <small>Thời gian ước tính: 3-5 giây</small>
        </div>
    `;
}

// Tìm kiếm nhạc trên YouTube với cache và duration
const searchCache = new Map();

async function searchYouTubeMusic(query) {
    // Kiểm tra cache trước
    if (searchCache.has(query)) {
        console.log('Loading from cache...');
        return searchCache.get(query);
    }
    
    try {
        showSearchingState(query);
        
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query + ' music')}&type=video&key=${YOUTUBE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        // Lấy video IDs để fetch duration
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        
        // Fetch duration cho tất cả videos
        const durationResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`);
        const durationData = await durationResponse.json();
        
        const tracks = data.items.map((item, index) => {
            const duration = durationData.items[index]?.contentDetails?.duration || 'PT0S';
            const parsedDuration = parseDuration(duration);
            
            return {
                id: item.id.videoId,
                title: item.snippet.title.replace(/[\[\](){}]/g, ''),
                artist: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
                embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&controls=0&enablejsapi=1`,
                duration: parsedDuration.seconds,
                durationText: parsedDuration.text
            };
        });
        
        // Lưu vào cache
        searchCache.set(query, tracks);
        
        return tracks;
    } catch (error) {
        console.error('Error searching YouTube:', error);
        showErrorState();
        return [];
    }
}

// Parse YouTube duration format (PT4M33S) thành seconds và text
function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    let text = '';
    if (hours > 0) {
        text = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return {
        seconds: totalSeconds,
        text: text
    };
}

function showSearchingState(query) {
    const musicCards = document.getElementById('musicCards');
    musicCards.innerHTML = `
        <div class="searching-state">
            <div class="search-animation">
                <i class="fas fa-search"></i>
                <div class="search-waves">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                </div>
            </div>
            <h3>🔍 Đang tìm kiếm: "${query}"</h3>
            <p>Đang quét qua hàng triệu bài hát...</p>
            <div class="dots-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
}

function showErrorState() {
    const musicCards = document.getElementById('musicCards');
    musicCards.innerHTML = `
        <div class="error-state">
            <i class="fas fa-wifi"></i>
            <h3>Oops! Có lỗi xảy ra</h3>
            <p>Kiểm tra kết nối internet hoặc thử lại sau</p>
            <button onclick="retrySearch()" class="retry-btn">
                <i class="fas fa-redo"></i> Thử lại
            </button>
        </div>
    `;
}

function retrySearch() {
    performSearch();
}

// Hiển thị kết quả với lazy loading
function displayTracks(tracks) {
    const musicCards = document.getElementById('musicCards');
    musicCards.innerHTML = '';
    
    if (tracks.length === 0) {
        musicCards.innerHTML = `
            <div class="no-results">
                <i class="fas fa-music"></i>
                <h3>Không tìm thấy kết quả</h3>
                <p>Thử tìm kiếm với từ khóa khác</p>
            </div>
        `;
        return;
    }
    
    currentSongs = tracks;
    
    // Hiển thị từng card với animation delay
    tracks.forEach((track, index) => {
        setTimeout(() => {
            const card = createTrackCard(track, index);
            musicCards.appendChild(card);
        }, index * 100); // Delay 100ms giữa các card
    });
    
    showNotification(`✅ Tìm thấy ${tracks.length} bài hát!`, 'success');
}

function createTrackCard(track, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-index', index);
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    card.innerHTML = `
        <div class="card-image">
            <img src="${track.thumbnail}" alt="${track.title}" loading="lazy">
            <div class="play-overlay">
                <button class="play-btn" onclick="playYouTubeTrack(${index})" data-index="${index}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="track-duration">
                <i class="fas fa-clock"></i> ${track.durationText || '0:00'}
            </div>
        </div>
        <div class="card-content">
            <h3 class="song-title" title="${track.title}">${truncateText(track.title, 50)}</h3>
            <p class="artist" title="${track.artist}">${truncateText(track.artist, 30)}</p>
            <div class="card-stats">
                <span class="views"><i class="fas fa-eye"></i> YouTube</span>
                <span class="quality"><i class="fas fa-hd-video"></i> HD</span>
            </div>
        </div>
    `;
    
    // Animation fade in
    setTimeout(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, 100);
    
    return card;
}

// Phát nhạc với loading state
function playYouTubeTrack(index) {
    const track = currentSongs[index];
    currentSongIndex = index;
    currentVideoDuration = track.duration || 210; // Fallback 3:30 nếu không có duration
    
    // Thay đổi icon thành loading ngay lập tức
    setCardLoadingState(index, true);
    
    // Hiển thị loading ngay lập tức
    showPlayingLoader(track);
    
    // Set timeout để user biết đang load
    loadingTimeout = setTimeout(() => {
        showNotification('⏳ Video đang tải, vui lòng chờ...', 'info');
    }, 2000);
    
    createYouTubePlayer(track.id);
    updatePlayerInfo(track.title, track.artist, track.thumbnail);
    showMusicControlBar();
    updateCardStates();
    
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    
    // Clear timeout khi loaded và restore play button
    setTimeout(() => {
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            showNotification(`🎵 Đang phát: ${track.title}`, 'success');
            setCardLoadingState(index, false);
        }
    }, 3000);
}

// Set loading state cho card button
function setCardLoadingState(index, isLoading) {
    const card = document.querySelector(`[data-index="${index}"]`);
    if (!card) return;
    
    const playBtn = card.querySelector('.play-btn i');
    if (!playBtn) return;
    
    if (isLoading) {
        playBtn.className = 'fas fa-spinner fa-spin';
        card.querySelector('.play-btn').style.pointerEvents = 'none';
    } else {
        playBtn.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        card.querySelector('.play-btn').style.pointerEvents = 'auto';
    }
}

function showPlayingLoader(track) {
    const musicControlBar = document.getElementById('musicControlBar');
    const currentSongTitle = document.getElementById('currentSongTitle');
    const currentSongArtist = document.getElementById('currentSongArtist');
    
    currentSongTitle.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tải...`;
    currentSongArtist.textContent = track.artist;
    
    musicControlBar.style.display = 'flex';
    musicControlBar.classList.add('show', 'loading');
    
    // Remove loading state sau 5 giây
    setTimeout(() => {
        musicControlBar.classList.remove('loading');
        currentSongTitle.textContent = track.title;
    }, 5000);
}

// Tạo YouTube player với error handling
function createYouTubePlayer(videoId) {
    let playerContainer = document.getElementById('youtubePlayer');
    
    if (!playerContainer) {
        playerContainer = document.createElement('div');
        playerContainer.id = 'youtubePlayer';
        playerContainer.style.display = 'none';
        document.body.appendChild(playerContainer);
    }
    
    // Clear previous player
    playerContainer.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.id = 'youtubeIframe';
    iframe.width = '0';
    iframe.height = '0';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1&origin=${window.location.origin}`;
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; encrypted-media';
    
    // Error handling for iframe
    iframe.onerror = () => {
        showNotification('❌ Không thể phát video này', 'error');
        setCardLoadingState(currentSongIndex, false);
        playNext(); // Auto skip to next
    };
    
    iframe.onload = () => {
        console.log('YouTube player loaded');
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        setCardLoadingState(currentSongIndex, false);
    };
    
    playerContainer.appendChild(iframe);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const colors = {
        success: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
        error: 'linear-gradient(45deg, #ff6b6b, #ee5a52)', 
        warning: 'linear-gradient(45deg, #ffd93d, #f9ca24)',
        info: 'linear-gradient(45deg, #45b7d1, #96ceb4)'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-weight: bold;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 350px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        cursor: pointer;
    `;
    
    // Click to dismiss
    notification.onclick = () => notification.remove();
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Cập nhật progress bar với duration thực tế
let progressInterval = null;
let fakeProgress = 0;

function startFakeProgress() {
    if (progressInterval) clearInterval(progressInterval);
    
    fakeProgress = 0;
    
    progressInterval = setInterval(() => {
        if (isPlaying) {
            fakeProgress += 1;
            const progressPercent = (fakeProgress / currentVideoDuration) * 100;
            
            document.getElementById('progress').style.width = Math.min(progressPercent, 100) + '%';
            document.getElementById('currentTime').textContent = formatTime(fakeProgress);
            document.getElementById('duration').textContent = formatTime(currentVideoDuration);
            
            if (fakeProgress >= currentVideoDuration) {
                clearInterval(progressInterval);
                playNext();
            }
        }
    }, 1000);
}

function stopFakeProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

// Điều khiển play/pause với feedback
function togglePlayPause() {
    const iframe = document.getElementById('youtubeIframe');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    if (!iframe) {
        showNotification('⚠️ Chưa có bài hát nào được chọn', 'warning');
        return;
    }
    
    if (isPlaying) {
        iframe.src = iframe.src.replace('autoplay=1', 'autoplay=0');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
        stopFakeProgress();
        showNotification('⏸️ Tạm dừng', 'info');
    } else {
        iframe.src = iframe.src.replace('autoplay=0', 'autoplay=1');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        isPlaying = true;
        startFakeProgress();
        showNotification('▶️ Tiếp tục phát', 'success');
    }
    
    updateCardStates();
}

// Phát bài tiếp theo với preloading
function playNext() {
    if (currentSongs.length === 0) {
        showNotification('📭 Danh sách trống', 'warning');
        return;
    }
    
    stopFakeProgress();
    
    if (isRepeat) {
        playYouTubeTrack(currentSongIndex);
        return;
    }
    
    if (isShuffle) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * currentSongs.length);
        } while (randomIndex === currentSongIndex && currentSongs.length > 1);
        currentSongIndex = randomIndex;
    } else {
        currentSongIndex = (currentSongIndex + 1) % currentSongs.length;
    }
    
    playYouTubeTrack(currentSongIndex);
}

// Phát bài trước
function playPrevious() {
    if (currentSongs.length === 0) {
        showNotification('📭 Danh sách trống', 'warning'); 
        return;
    }
    
    stopFakeProgress();
    
    if (isShuffle) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * currentSongs.length);
        } while (randomIndex === currentSongIndex && currentSongs.length > 1);
        currentSongIndex = randomIndex;
    } else {
        currentSongIndex = currentSongIndex === 0 ? currentSongs.length - 1 : currentSongIndex - 1;
    }
    
    playYouTubeTrack(currentSongIndex);
}

// Toggle functions với feedback
function toggleShuffle() {
    isShuffle = !isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', isShuffle);
        showNotification(isShuffle ? '🔀 Shuffle: Bật' : '🔀 Shuffle: Tắt', 'info');
    }
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const repeatBtn = document.getElementById('repeatBtn');
    if (repeatBtn) {
        repeatBtn.classList.toggle('active', isRepeat);
        showNotification(isRepeat ? '🔁 Repeat: Bật' : '🔁 Repeat: Tắt', 'info');
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const muteBtn = document.getElementById('muteBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    
    if (isMuted) {
        muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        volumeSlider.value = 0;
        showNotification('🔇 Tắt âm thanh', 'info');
    } else {
        muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        volumeSlider.value = previousVolume;
        showNotification('🔊 Bật âm thanh', 'info');
    }
}

// Utility functions (giữ nguyên)
function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updatePlayerInfo(title, artist, thumbnail) {
    document.getElementById('currentSongTitle').textContent = title;
    document.getElementById('currentSongArtist').textContent = artist;
    
    const currentSongImage = document.getElementById('currentSongImage');
    if (currentSongImage) {
        currentSongImage.src = thumbnail;
        currentSongImage.style.display = 'block';
    }
}

function showMusicControlBar() {
    const musicControlBar = document.getElementById('musicControlBar');
    if (musicControlBar) {
        musicControlBar.style.display = 'flex';
        musicControlBar.classList.add('show');
        startFakeProgress();
    }
}

function updateCardStates() {
    document.querySelectorAll('.card').forEach((card, index) => {
        const playBtn = card.querySelector('.play-btn i');
        if (!playBtn) return;
        
        if (index === currentSongIndex) {
            card.classList.add('playing');
            // Chỉ đổi icon nếu không đang loading
            if (!playBtn.classList.contains('fa-spinner')) {
                playBtn.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        } else {
            card.classList.remove('playing');
            // Reset về play icon nếu không đang loading
            if (!playBtn.classList.contains('fa-spinner')) {
                playBtn.className = 'fas fa-play';
            }
        }
    });
}

// Search và event listeners (giữ nguyên code cũ nhưng thêm feedback)
function createSearchSection() {
    const container = document.querySelector('.container');
    const title = document.querySelector('.title');
    
    if (!container || !title || document.querySelector('.search-section')) return;
    
    const searchSection = document.createElement('div');
    searchSection.className = 'search-section';
    searchSection.innerHTML = `
        <input type="text" id="searchInput" placeholder="Tìm kiếm bài hát, nghệ sĩ trên YouTube..." autocomplete="off">
        <button id="searchBtn"><i class="fas fa-search"></i></button>
        <div class="search-suggestions" id="searchSuggestions" style="display: none;"></div>
    `;
    
    title.insertAdjacentElement('afterend', searchSection);
    
    // Thêm search suggestions
    setupSearchSuggestions();
}

function setupSearchSuggestions() {
    const searchInput = document.getElementById('searchInput');
    const suggestions = ['vpop 2024', 'ballad vietnam', 'rap vietnam', 'acoustic covers', 'chill music'];
    
    searchInput.addEventListener('focus', () => {
        const suggestionDiv = document.getElementById('searchSuggestions');
        suggestionDiv.innerHTML = suggestions.map(s => 
            `<div class="suggestion" onclick="searchSuggestion('${s}')">${s}</div>`
        ).join('');
        suggestionDiv.style.display = 'block';
    });
    
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            document.getElementById('searchSuggestions').style.display = 'none';
        }, 200);
    });
}

function searchSuggestion(query) {
    document.getElementById('searchInput').value = query;
    performSearch();
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    if (!query) {
        showNotification('🔍 Vui lòng nhập từ khóa tìm kiếm', 'warning');
        return;
    }
    
    showNotification('🔍 Đang tìm kiếm...', 'info');
    
    try {
        const tracks = await searchYouTubeMusic(query);
        displayTracks(tracks);
    } catch (error) {
        showErrorState();
    }
}

// Setup event listeners
function setupEventListeners() {
    const elements = {
        searchBtn: document.getElementById('searchBtn'),
        searchInput: document.getElementById('searchInput'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        shuffleBtn: document.getElementById('shuffleBtn'),
        repeatBtn: document.getElementById('repeatBtn'),
        muteBtn: document.getElementById('muteBtn'),
        volumeSlider: document.getElementById('volumeSlider')
    };
    
    Object.entries(elements).forEach(([key, element]) => {
        if (!element) return;
        
        switch(key) {
            case 'searchBtn':
                element.addEventListener('click', performSearch);
                break;
            case 'searchInput':
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') performSearch();
                });
                break;
            case 'playPauseBtn':
                element.addEventListener('click', togglePlayPause);
                break;
            case 'nextBtn':
                element.addEventListener('click', playNext);
                break;
            case 'prevBtn':
                element.addEventListener('click', playPrevious);
                break;
            case 'shuffleBtn':
                element.addEventListener('click', toggleShuffle);
                break;
            case 'repeatBtn':
                element.addEventListener('click', toggleRepeat);
                break;
            case 'muteBtn':
                element.addEventListener('click', toggleMute);
                break;
            case 'volumeSlider':
                element.addEventListener('input', (e) => {
                    previousVolume = e.target.value;
                    const muteBtn = document.getElementById('muteBtn');
                    if (e.target.value == 0) {
                        muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                        isMuted = true;
                    } else {
                        muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                        isMuted = false;
                    }
                });
                break;
        }
    });
}

// Galaxy particles và card interactions (giữ nguyên)
function createGalaxyParticles() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'galaxy-particles';
    particleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
    `;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particleFloat ${Math.random() * 20 + 10}s linear infinite;
        `;
        particleContainer.appendChild(particle);
    }
    
    document.body.appendChild(particleContainer);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes particleFloat {
            0% {
                transform: translateY(100vh) translateX(0px);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100px) translateX(${Math.random() * 200 - 100}px);
                opacity: 0;
            }
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

function addCardInteractions() {
    setTimeout(() => {
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                const ripple = document.createElement('div');
                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 0;
                    height: 0;
                    z-index: 1;
                `;
                
                this.style.position = 'relative';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
        
        const rippleStyle = document.createElement('style');
        rippleStyle.textContent = `
            @keyframes ripple {
                to {
                    width: 300px;
                    height: 300px;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(rippleStyle);
    }, 1000);
}

// Prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    if (progressInterval) clearInterval(progressInterval);
});