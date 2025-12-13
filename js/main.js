// --- DATA MANAGEMENT FUNCTIONS ---
function getAllServices() {
    // Get services from localStorage
    const savedServices = JSON.parse(localStorage.getItem('iitWorksServices') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    // Add ownership info to each service
    return savedServices.map(service => {
        return {
            ...service,
            isOwner: currentUser && (
                (service.userId !== undefined && String(service.userId) === String(currentUser.id)) ||
                (service.userEmail && currentUser.email && service.userEmail === currentUser.email)
            ),
            canDelete: currentUser && (
                (service.userId !== undefined && String(service.userId) === String(currentUser.id)) ||
                (service.userEmail && currentUser.email && service.userEmail === currentUser.email) ||
                currentUser.role === 'admin'
            )
        };
    });
}

function getServicesByCategory(category) {
    const allServices = getAllServices();
    if (category === 'all') return allServices;
    return allServices.filter(service => service.category === category);
}

function saveService(serviceData) {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!user) {
        showSuccessMessage('Please sign in to post a service', 'error');
        window.location.href = 'auth.html';
        return null;
    }
    
    const jobData = {
        ...serviceData,
        id: Date.now(),
        userId: user.id, // Link job to user
        userEmail: user.email,
        posted: 'Just now'
    };
    
    let savedServices = JSON.parse(localStorage.getItem('iitWorksServices') || '[]');
    savedServices.push(jobData);
    localStorage.setItem('iitWorksServices', JSON.stringify(savedServices));
    
    return jobData;
}

function getCategoryName(category) {
    const names = {
        'art': '🎨 Art & Design',
        'tech': '💻 Tech & Coding',
        'acad': '📚 Academic Help',
        'food': '🍕 Food & Snacks',
        'other': '✨ Other Services',
        'all': 'All Categories'
    };
    return names[category] || category;
}

// --- AUTHENTICATION CHECK ---
function checkAuthAndRedirect() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const currentPage = window.location.pathname;
    
    // List of pages that require login
    const protectedPages = ['index.html', 'post.html', 'directory.html', 'profile.html', 'admin.html'];
    
    // Check if current page requires authentication
    const isProtectedPage = protectedPages.some(page => currentPage.includes(page));
    
    // If page requires auth and user is not logged in, redirect to landing page
    if (isProtectedPage && !user) {
        window.location.href = 'landing.html';
        return false;
    }
    
    // If user is on auth page but already logged in, redirect to home
    if ((currentPage.includes('auth.html') || currentPage.includes('signin.html')) && user) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// --- SEARCH FUNCTION ---
function searchServices(event) {
    if (event && event.keyCode && event.keyCode !== 13) return;
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const allServices = getAllServices();
    
    if (searchTerm === '') {
        renderFeed();
        return;
    }
    
    const filtered = allServices.filter(service => {
        const searchText = searchTerm.toLowerCase();
        return (
            service.title.toLowerCase().includes(searchText) ||
            service.description.toLowerCase().includes(searchText) ||
            service.student.toLowerCase().includes(searchText) ||
            service.course.toLowerCase().includes(searchText) ||
            service.price.toLowerCase().includes(searchText) ||
            getCategoryName(service.category).toLowerCase().includes(searchText)
        );
    });
    
    displaySearchResults(filtered, searchTerm);
}

function displaySearchResults(services, searchTerm) {
    const feed = document.getElementById('feed');
    
    if (services.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No services found for "${searchTerm}"</h3>
                <p>Try different search terms or browse by category</p>
            </div>
        `;
        return;
    }
    
    feed.innerHTML = '';
    
    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'gig-card';
        card.onclick = () => selectService(service, card);
        
        card.innerHTML = `
            <div class="gig-title">${service.title}</div>
            <div class="gig-student"><i class="fas fa-user-graduate"></i> ${service.student}</div>
            <div class="gig-course">${service.course}</div>
            <div class="tags">
                <span class="tag price"><i class="fas fa-tag"></i> ${service.price}</span>
                <span class="tag ${service.category}">${getCategoryName(service.category)}</span>
            </div>
            <div class="gig-excerpt">${service.description.substring(0, 100)}...</div>
            <div style="font-size: 12px; color: var(--muted); margin-top: 12px;"><i class="far fa-clock"></i> Posted ${service.posted}</div>
        `;
        feed.appendChild(card);
    });
}

// --- CATEGORY FILTER ---
let currentCategory = 'all';

function setCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const buttons = document.querySelectorAll('.category-btn');
    for (let btn of buttons) {
        if (btn.onclick && btn.onclick.toString().includes(`'${category}'`)) {
            btn.classList.add('active');
            break;
        }
    }
    
    if (document.getElementById('searchInput')) {
        document.getElementById('searchInput').value = '';
    }
    
    renderFeed();
}

function renderFeed() {
    const feed = document.getElementById('feed');
    if (!feed) return;
    
    const services = getServicesByCategory(currentCategory);
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (services.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No services in ${getCategoryName(currentCategory)} yet</h3>
                <p>Be the first to post a service in this category!</p>
            </div>
        `;
        return;
    }
    
    feed.innerHTML = '';
    
    services.sort((a, b) => b.id - a.id).forEach((service, index) => {
        const card = document.createElement('div');
        card.className = 'gig-card';
        card.onclick = () => selectService(service, card);
        
        // Check if current user can delete this service
        const canDelete = service.canDelete || (currentUser && (
            (service.userId !== undefined && String(service.userId) === String(currentUser.id)) ||
            (service.userEmail && currentUser.email && service.userEmail === currentUser.email) ||
            currentUser.role === 'admin'
        ));
        
        // Delete button (only for owner or admin)
        const deleteButton = canDelete ? `
            <button class="delete-job-btn" 
                    onclick="event.stopPropagation(); showDeleteJobModal(${service.id}, '${service.title.replace(/'/g, "\\'")}')" 
                    style="position: absolute; top: 15px; right: 15px; background: #dc2626; color: white; border: none; border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; z-index: 10;">
                <i class="fas fa-trash"></i> Delete
            </button>
        ` : '';
        
        // Owner badge
        const ownerBadge = service.isOwner ? `
            <span class="badge-iitian" style="position: absolute; top: 15px; left: 15px; z-index: 10;">
                <i class="fas fa-user-check"></i> Your Post
            </span>
        ` : '';
        
        // Admin badge
        const adminBadge = (currentUser && currentUser.role === 'admin' && !service.isOwner) ? `
            <span class="badge-iitian" style="position: absolute; top: 15px; left: 15px; background: #dc2626; z-index: 10;">
                <i class="fas fa-crown"></i> Admin View
            </span>
        ` : '';
        
        card.innerHTML = `
            ${deleteButton}
            ${ownerBadge}
            ${adminBadge}
            <div class="gig-title">${service.title}</div>
            <div class="gig-student"><i class="fas fa-user-graduate"></i> ${service.student}</div>
            <div class="gig-course">${service.course}</div>
            <div class="tags">
                <span class="tag price"><i class="fas fa-tag"></i> ${service.price}</span>
                <span class="tag ${service.category}">${getCategoryName(service.category)}</span>
            </div>
            <div class="gig-excerpt">${service.description.substring(0, 100)}...</div>
            <div style="font-size: 12px; color: var(--muted); margin-top: 12px;">
                <i class="far fa-clock"></i> Posted ${service.posted}
                ${service.isOwner ? '<span style="margin-left: 10px; color: var(--primary);"><i class="fas fa-star"></i> Your Post</span>' : ''}
            </div>
        `;
        feed.appendChild(card);
    });
}
// --- SERVICE DETAILS ---
let selectedService = null;

function selectService(service, cardElement) {
    selectedService = service;
    if (cardElement) {
        document.querySelectorAll('.gig-card').forEach(c => c.classList.remove('selected'));
        cardElement.classList.add('selected');
    }
    
    if(window.innerWidth <= 900 && document.getElementById('detailsPane')) {
        document.getElementById('detailsPane').classList.add('open');
    }

    updateServiceDetails(service);
}

function updateServiceDetails(service) {
    const detailContent = document.getElementById('detail-content');
    const studentContent = document.getElementById('student-content');
    
    if (!detailContent || !studentContent) return;
    
    detailContent.innerHTML = `
        <div class="detail-header">
            <div class="detail-title">${service.title}</div>
            <div class="detail-student">
                <i class="fas fa-user-graduate"></i> ${service.student}
                <span class="student-badge"><i class="fas fa-check-circle"></i> Verified IITian</span>
            </div>
            <div class="detail-course">${service.course}</div>
            <div class="tags" style="margin: 15px 0;">
                <span class="tag price" style="font-size: 14px;"><i class="fas fa-tag"></i> ${service.price}</span>
                <span class="tag ${service.category}" style="font-size: 14px;">${getCategoryName(service.category)}</span>
            </div>
            <button class="contact-btn" onclick="contactStudent('${service.student}', '${service.contact}')">
                <i class="fas fa-envelope"></i> Contact ${service.student.split(' ')[0]}
            </button>
        </div>
        <div>
            <h3 style="color: var(--primary); margin-bottom: 10px;">Service Description</h3>
            <p style="line-height: 1.6; margin-bottom: 20px;">${service.description}</p>
            
            <h3 style="color: var(--primary); margin-bottom: 10px;">Contact Information</h3>
            <div style="background: #fff5f5; padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
                <p style="margin: 0; font-weight: 600;">${service.contact}</p>
                <small style="color: var(--muted); display: block; margin-top: 5px;"><i class="fas fa-lock"></i> Only visible to MSU-IIT students</small>
            </div>
            
            ${service.portfolio ? `
            <h3 style="color: var(--primary); margin-top: 20px; margin-bottom: 10px;">Portfolio/Samples</h3>
            <p style="color: var(--muted);">${service.portfolio}</p>
            ` : ''}
        </div>
    `;

    studentContent.innerHTML = `
        <div style="text-align: center;">
            <div style="width: 100px; height: 100px; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 700; margin: 0 auto 20px;">
                ${service.student.split(' ').map(n => n[0]).join('')}
            </div>
            <div class="detail-title">${service.student}</div>
            <div class="detail-course" style="font-size: 16px; margin-bottom: 20px;">${service.course}</div>
            
            <div style="background: #fff5f5; padding: 20px; border-radius: 10px; text-align: left;">
                <h4 style="color: var(--primary); margin-bottom: 10px;">About ${service.student.split(' ')[0]}</h4>
                <p style="color: var(--text); line-height: 1.6;">${service.student.split(' ')[0]} is a dedicated MSU-IIT student offering ${getCategoryName(service.category).toLowerCase()} services to fellow IITians.</p>
            </div>
        </div>
    `;
}

function contactStudent(studentName, contactInfo) {
    showSuccessMessage(`Contact info for ${studentName}: ${contactInfo}`, 'success');
}

function switchTab(tabName) {
    document.querySelectorAll('.pane-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content-view').forEach(c => c.classList.remove('active'));
    
    if (tabName === 'details') {
        document.querySelector('.pane-tab:nth-child(1)').classList.add('active');
        document.getElementById('view-details').classList.add('active');
    } else {
        document.querySelector('.pane-tab:nth-child(2)').classList.add('active');
        document.getElementById('view-student').classList.add('active');
    }
}

function closeMobileDetails() {
    if (document.getElementById('detailsPane')) {
        document.getElementById('detailsPane').classList.remove('open');
    }
    document.querySelectorAll('.gig-card').forEach(c => c.classList.remove('selected'));
}

// --- SUCCESS MESSAGE ---
function showSuccessMessage(message, type = 'success') {
    const msg = document.getElementById('successMessage');
    const title = document.getElementById('successTitle');
    const subtitle = document.getElementById('successSubtitle');
    
    if (!msg || !title || !subtitle) return;
    
    title.textContent = message;
    subtitle.textContent = type === 'success' ? 'Your action was successful!' : 'Please try again';
    
    msg.style.background = type === 'success' ? '#047857' : '#dc2626';
    msg.classList.remove('hidden');
    
    setTimeout(() => {
        msg.classList.add('hidden');
    }, 3000);
}

// --- STUDENT DIRECTORY FUNCTIONS ---
function loadStudentDirectory() {
    const directory = document.getElementById('studentDirectory');
    if (!directory) return;
    
    const allServices = getAllServices();
    
    if (allServices.length === 0) {
        directory.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-users"></i>
                <h3>No students have posted services yet</h3>
                <p>Be the first to post a service!</p>
            </div>
        `;
        return;
    }
    
    directory.innerHTML = '';
    
    const studentMap = new Map();
    allServices.forEach(service => {
        if (!studentMap.has(service.student)) {
            studentMap.set(service.student, {
                name: service.student,
                course: service.course,
                category: service.category,
                services: 1
            });
        } else {
            studentMap.get(service.student).services++;
        }
    });
    
    const students = Array.from(studentMap.values());
    
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'gig-card';
        card.style.textAlign = 'center';
        card.style.cursor = 'pointer';
        card.onclick = () => viewStudentProfile(student.name);
        
        const initials = student.name.split(' ').map(n => n[0]).join('');
        
        card.innerHTML = `
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin: 0 auto 15px;">
                ${initials}
            </div>
            <div class="gig-title">${student.name}</div>
            <div class="gig-course">${student.course}</div>
            <div style="margin: 15px 0;">
                <span class="badge-iitian"><i class="fas fa-check-circle"></i> Verified IITian</span>
            </div>
            <div style="color: var(--muted); font-size: 14px; margin-bottom: 15px;">
                ${student.services} service${student.services > 1 ? 's' : ''} listed
            </div>
            <button class="contact-btn" style="width: auto; padding: 10px 20px;" onclick="event.stopPropagation(); viewStudentProfile('${student.name}')">
                <i class="fas fa-eye"></i> View Services
            </button>
        `;
        directory.appendChild(card);
    });
}

function viewStudentProfile(studentName) {
    const allServices = getAllServices();
    const studentServices = allServices.filter(s => s.student === studentName);
    
    if (studentServices.length > 0) {
        // Redirect to homepage with filter
        window.location.href = `index.html?student=${encodeURIComponent(studentName)}`;
    }
}

// --- AUTHENTICATION UI FUNCTIONS ---
function updateNavForAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const navRight = document.querySelector('.nav-right');
    
    if (navRight) {
        if (user) {
            // User is logged in — expose action links only (username is shown in the header controls)
            navRight.innerHTML = `
                <a href="profile.html" class="sign-in">
                    <i class="fas fa-user"></i> My Profile
                </a>
                ${user.role === 'admin' ? `
                <a href="admin.html" class="sign-in">
                    <i class="fas fa-crown"></i> Admin Panel
                </a>
                ` : ''}
                <a href="#" class="sign-in" onclick="logoutUser()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
                <a href="post.html" class="post-gig-link">
                    <i class="fas fa-plus-circle"></i> Post Your Service
                </a>
            `;
        } else {
            // User is not logged in
            navRight.innerHTML = `
                <a href="auth.html" class="sign-in">
                    <i class="fas fa-graduation-cap"></i> IIT Sign In
                </a>
                <a href="auth.html" class="post-gig-link" onclick="showSuccessMessage('Please sign in to post a service', 'error')">
                    <i class="fas fa-plus-circle"></i> Post Your Service
                </a>
            `;
        }
    }
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.setItem('currentUser', JSON.stringify(null));
        showSuccessMessage('Logged out successfully');
        setTimeout(() => {
            window.location.href = 'landing.html';
        }, 1500);
    }
}

// Delete job function
function confirmDeleteJob(jobId) {
    if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
        const result = Admin.deleteJob(jobId);
        
        if (result.success) {
            showSuccessMessage(result.message);
            renderFeed();
            
            // Clear details pane if viewing deleted job
            const detailContent = document.getElementById('detail-content');
            if (detailContent) {
                detailContent.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-trash"></i>
                        <p>This service has been deleted</p>
                    </div>
                `;
            }
        } else {
            showSuccessMessage(result.message, 'error');
        }
    }
}

// Provide a global delete modal function used by feed buttons
function showDeleteJobModal(jobId, jobTitle) {
    // Fallback modal for pages that don't include admin.html's modal
    const confirmText = `Are you sure you want to delete the service:\n"${jobTitle}"?\n\nThis action cannot be undone.`;
    if (!confirm(confirmText)) return;

    const result = Admin.deleteJob(jobId);
    if (result.success) {
        showSuccessMessage(result.message + (result.jobTitle ? `: "${result.jobTitle}"` : ''));
        renderFeed();

        // Clear details pane if viewing deleted job
        const detailContent = document.getElementById('detail-content');
        if (detailContent) {
            detailContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trash"></i>
                    <h3>Service Deleted</h3>
                    <p>This service has been removed</p>
                </div>
            `;
        }
    } else {
        showSuccessMessage(result.message, 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication
    if (typeof Auth !== 'undefined') {
        Auth.init();
    }
    
    // Check authentication and redirect if needed
    if (!checkAuthAndRedirect()) {
        return;
    }
    
    // Update UI based on auth status
    updateNavForAuth();
    
    const currentPage = window.location.pathname;
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    // Additional admin checks
    if (currentPage.includes('admin.html') && (!user || user.role !== 'admin')) {
        showSuccessMessage('Admin access required', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Render feed if on homepage
    if (currentPage.includes('index.html') || currentPage === '/') {
        renderFeed();
        
        // Check for student filter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const studentFilter = urlParams.get('student');
        if (studentFilter) {
            const allServices = getAllServices();
            const studentServices = allServices.filter(s => s.student === studentFilter);
            if (studentServices.length > 0) {
                selectService(studentServices[0]);
            }
        }
    }
    // Header nav toggle button + popup (only for signed-in users)
    try {
        const hdr = document.querySelector('.hdr');
        // remove any previous injected controls to avoid duplicates
        document.querySelectorAll('.nav-toggle-btn, .nav-popup, .outer-post, .user-label').forEach(el => el.remove());

        const curUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!hdr) return;

        // Only add toggle, popup and outer post when user is logged in
        if (curUser) {
            const toggle = document.createElement('button');
            toggle.className = 'nav-toggle-btn';
            toggle.setAttribute('aria-label', 'Open menu');
            toggle.innerHTML = '<i class="fas fa-ellipsis-v"></i>';

            const popup = document.createElement('div');
            popup.className = 'nav-popup';
            const navRight = document.querySelector('.nav-right');
                    if (navRight) {
                        // Build a clean popup menu (no username header) using the logical auth links
                        popup.innerHTML = '';
                        // My Profile
                        const profileLink = document.createElement('a');
                        profileLink.href = 'profile.html';
                        profileLink.innerHTML = '<i class="fas fa-user"></i> My Profile';
                        popup.appendChild(profileLink);

                        // Admin panel for admins
                        try {
                            if (curUser && curUser.role === 'admin') {
                                const adminLink = document.createElement('a');
                                adminLink.href = 'admin.html';
                                adminLink.innerHTML = '<i class="fas fa-crown"></i> Admin Panel';
                                popup.appendChild(adminLink);
                            }
                        } catch (err) {}

                        // Logout
                        const logoutLink = document.createElement('a');
                        logoutLink.href = '#';
                        logoutLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                        logoutLink.addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });
                        popup.appendChild(logoutLink);
                    } else {
                        // fallback links (no post link here because outer-post is primary)
                        popup.innerHTML = '<a href="index.html">Home</a><a href="directory.html">Student Directory</a>';
                    }

            // outer Post button (outside the dots)
            const outerPost = document.createElement('a');
            outerPost.className = 'post-gig-link outer-post';
            outerPost.href = 'post.html';
            outerPost.innerHTML = '<i class="fas fa-plus-circle"></i> Post a Service';

            // user label showing email local-part or name
            // Show first + last name when available (real accounts), otherwise fallback to single name or email local-part
            let labelText = 'You';
            try {
                if (curUser.name) {
                    const parts = curUser.name.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        labelText = parts[0] + ' ' + parts[parts.length - 1];
                    } else {
                        labelText = parts[0];
                    }
                } else if (curUser.email && curUser.email.includes('@')) {
                    labelText = curUser.email.split('@')[0];
                }
            } catch (e) {
                labelText = (curUser.name) ? curUser.name : ((curUser.email && curUser.email.includes('@')) ? curUser.email.split('@')[0] : 'You');
            }

            const userLabel = document.createElement('div');
            userLabel.className = 'user-label';
            userLabel.innerHTML = `<i class="fas fa-user-circle" style="margin-right:8px; font-size:18px;"></i> ${labelText}`;

            // Create a container so controls align together relative to the header
            const controls = document.createElement('div');
            controls.className = 'hdr-controls';
            // order: user label, outer post, toggle
            controls.appendChild(userLabel);
            controls.appendChild(outerPost);
            controls.appendChild(toggle);

            hdr.appendChild(controls);

            hdr.appendChild(popup);

            // Toggle popup on button click
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                popup.classList.toggle('open');
                toggle.classList.toggle('open');
                const expanded = popup.classList.contains('open');
                toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            });

            // Close popup when clicking an item inside it
            popup.addEventListener('click', (e) => {
                const target = e.target.closest('a, button');
                if (target) {
                    setTimeout(() => { popup.classList.remove('open'); toggle.classList.remove('open'); }, 10);
                }
            });

            // Close popup when clicking outside
            document.addEventListener('click', (e) => {
                if (!popup.contains(e.target) && !toggle.contains(e.target)) {
                    if (popup.classList.contains('open')) { popup.classList.remove('open'); toggle.classList.remove('open'); }
                }
            });

            // Close popup on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && popup.classList.contains('open')) { popup.classList.remove('open'); toggle.classList.remove('open'); }
            });
        }
    } catch (e) {
        console.warn('Nav popup init failed', e);
    }
    // Delete job function for regular users
function confirmDeleteJob(jobId) {
    if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
        const result = Admin.deleteJob(jobId);
        
        if (result.success) {
            showSuccessMessage(result.message + `: "${result.jobTitle}"`);
            renderFeed();
            
            // Clear details pane if viewing deleted job
            const detailContent = document.getElementById('detail-content');
            if (detailContent) {
                detailContent.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-trash"></i>
                        <h3>Service Deleted</h3>
                        <p>This service has been removed from the Campus Quest</p>
                    </div>
                `;
            }
        } else {
            showSuccessMessage(result.message, 'error');
        }
    }
}

// Enhanced delete confirmation with reason
function confirmDeleteWithReason(jobId, jobTitle) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
            <h3 style="color: var(--primary); margin-bottom: 15px;">
                <i class="fas fa-trash"></i> Delete Service
            </h3>
            <p>Are you sure you want to delete "<strong>${jobTitle}</strong>"?</p>
            <p style="color: #dc2626; font-size: 14px; margin: 15px 0;">
                <i class="fas fa-exclamation-triangle"></i> This action cannot be undone.
            </p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 8px; cursor: pointer;">
                    Cancel
                </button>
                <button onclick="deleteJobConfirmed(${jobId})" 
                        style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Delete Service
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function deleteJobConfirmed(jobId) {
    const result = Admin.deleteJob(jobId);
    document.querySelectorAll('[style*="position: fixed"]').forEach(el => el.remove());
    
    if (result.success) {
        showSuccessMessage(result.message + `: "${result.jobTitle}"`);
        renderFeed();
        
        // Clear details pane if viewing deleted job
        const detailContent = document.getElementById('detail-content');
        if (detailContent) {
            detailContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trash"></i>
                    <h3>Service Deleted</h3>
                    <p>This service has been removed from the Campus Quest</p>
                </div>
            `;
        }
    } else {
        showSuccessMessage(result.message, 'error');
    }
}
});