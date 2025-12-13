// Authentication System
const Auth = {
    // Initialize with default admin account
    init() {
        // Check if users exist in localStorage, if not create default
        if (!localStorage.getItem('iitWorksUsers')) {
            const defaultUsers = [
                {
                    id: 1,
                    email: 'admin@msuiit.edu.ph',
                    password: 'admin123',
                    name: 'System Admin',
                    course: 'Administration',
                    role: 'admin',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    email: 'student@msuiit.edu.ph',
                    password: 'student123',
                    name: 'Sample Student',
                    course: 'BS Computer Application 1st Year',
                    role: 'user',
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem('iitWorksUsers', JSON.stringify(defaultUsers));
        }
        
        // Migrate any stored users: replace 'Computer Science' with 'Computer Application'
        try {
            const stored = JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
            let changed = false;
            const migrated = stored.map(u => {
                if (u && u.course && /Computer Science/i.test(u.course)) {
                    u.course = u.course.replace(/Computer Science/ig, 'Computer Application');
                    changed = true;
                }
                return u;
            });
            if (changed) {
                localStorage.setItem('iitWorksUsers', JSON.stringify(migrated));
            }

            // Also migrate currentUser if present
            const current = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (current && current.course && /Computer Science/i.test(current.course)) {
                current.course = current.course.replace(/Computer Science/ig, 'Computer Application');
                localStorage.setItem('currentUser', JSON.stringify(current));
            }
        } catch (e) {
            // If parsing fails, do nothing (leave storage untouched)
            console.warn('User migration skipped:', e);
        }
        
        // Initialize current user
        if (!localStorage.getItem('currentUser')) {
            localStorage.setItem('currentUser', JSON.stringify(null));
        }

        // Migrate services so they have proper userId/userEmail linking
        try {
            const services = JSON.parse(localStorage.getItem('iitWorksServices') || '[]');
            const users = JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
            let svcChanged = false;

            const migratedServices = services.map(s => {
                // If service already has a userId, ensure it also has userEmail
                if (s.userId !== undefined && (!s.userEmail || s.userEmail === '')) {
                    const match = users.find(u => String(u.id) === String(s.userId));
                    if (match && match.email) {
                        s.userEmail = match.email;
                        svcChanged = true;
                    }
                }

                // If service is missing userId but has userEmail, try to attach userId
                if ((s.userId === undefined || s.userId === null) && s.userEmail) {
                    const matchByEmail = users.find(u => u.email && u.email === s.userEmail);
                    if (matchByEmail) {
                        s.userId = matchByEmail.id;
                        svcChanged = true;
                    }
                }

                // If still missing userId, try matching by student name to a user name
                if ((s.userId === undefined || s.userId === null) && s.student) {
                    const matchByName = users.find(u => u.name && u.name === s.student);
                    if (matchByName) {
                        s.userId = matchByName.id;
                        if (!s.userEmail && matchByName.email) s.userEmail = matchByName.email;
                        svcChanged = true;
                    }
                }

                return s;
            });

            if (svcChanged) {
                localStorage.setItem('iitWorksServices', JSON.stringify(migratedServices));
            }
        } catch (e) {
            console.warn('Service migration skipped:', e);
        }
    },

    // Get all users
    getAllUsers() {
        return JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
    },

    // Get current user
    getCurrentUser() {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        return user;
    },

    // Set current user
    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    // Logout
    logout() {
        localStorage.setItem('currentUser', JSON.stringify(null));
        window.location.href = 'index.html';
    },

    // Login
    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            this.setCurrentUser(user);
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password' };
    },

    // Signup
    signup(userData) {
        const users = this.getAllUsers();
        
        // Check if email already exists
        if (users.some(u => u.email === userData.email)) {
            return { success: false, message: 'Email already registered' };
        }

        // Validate IIT email
        if (!userData.email.includes('@g.msuiit.edu.ph')) {
            return { success: false, message: 'Please use MSU-IIT email (@g.msuiit.edu.ph)' };
        }

        // Create new user
        const newUser = {
            id: Date.now(),
            email: userData.email,
            password: userData.password,
            name: userData.name,
            course: userData.course,
            role: 'user', // Default role is user
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('iitWorksUsers', JSON.stringify(users));
        
        // Auto login after signup
        this.setCurrentUser(newUser);
        
        return { success: true, user: newUser };
    },

    // Check if user is admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    // Update user profile
    updateProfile(updatedData) {
        const users = this.getAllUsers();
        const currentUser = this.getCurrentUser();
        
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex !== -1) {
            // Keep email and role unchanged
            users[userIndex] = {
                ...users[userIndex],
                name: updatedData.name || users[userIndex].name,
                course: updatedData.course || users[userIndex].course,
                bio: updatedData.bio || users[userIndex].bio
            };
            
            localStorage.setItem('iitWorksUsers', JSON.stringify(users));
            this.setCurrentUser(users[userIndex]);
            return { success: true };
        }
        
        return { success: false };
    }
};
