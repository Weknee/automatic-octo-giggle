// Admin Management System
const Admin = {
    // Get all jobs with user info
    getAllJobsWithUsers() {
        const jobs = JSON.parse(localStorage.getItem('iitWorksServices') || '[]');
        const users = JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
        
        return jobs.map(job => {
            const postedBy = users.find(u => String(u.id) === String(job.userId) || (u.email && job.userEmail && u.email === job.userEmail));
            return {
                ...job,
                postedBy: postedBy ? postedBy.name : 'Unknown User',
                userEmail: postedBy ? postedBy.email : 'Unknown',
                userName: postedBy ? postedBy.name : 'Unknown'
            };
        });
    },

    // Get all users (admin only)
    getAllUsers() {
        if (!Auth.isAdmin()) return [];
        return JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
    },

    // Delete job (admin or owner)
    deleteJob(jobId) {
        const jobs = JSON.parse(localStorage.getItem('iitWorksServices') || '[]');
        const currentUser = Auth.getCurrentUser();
        
        // Find the job
        const jobIndex = jobs.findIndex(job => job.id === jobId);
        
        if (jobIndex === -1) {
            return { success: false, message: 'Job not found' };
        }
        
        const job = jobs[jobIndex];
        
        // Check permissions: allow owner if IDs match (flexible types) or emails match, or admin
        const isOwner = currentUser && (
            (job.userId !== undefined && String(job.userId) === String(currentUser.id)) ||
            (job.userEmail && currentUser.email && job.userEmail === currentUser.email)
        );
        const isAdmin = Auth.isAdmin();

        if (!isOwner && !isAdmin) {
            return { success: false, message: 'Permission denied. Only job owner or admin can delete.' };
        }
        
        // Remove the job
        jobs.splice(jobIndex, 1);
        localStorage.setItem('iitWorksServices', JSON.stringify(jobs));
        
        return { 
            success: true, 
            message: 'Job deleted successfully',
            jobTitle: job.title
        };
    },

    // Delete user (admin only)
    deleteUser(userId) {
        if (!Auth.isAdmin()) {
            return { success: false, message: 'Admin access required' };
        }
        
        const users = JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
        const jobs = JSON.parse(localStorage.getItem('iitWorksServices') || '[]');
        
        // Don't allow self-deletion
        const currentUser = Auth.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            return { success: false, message: 'Cannot delete your own account' };
        }
        
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return { success: false, message: 'User not found' };
        }
        
        const userToDelete = users[userIndex];
        
        // Count user's jobs
        const userJobs = jobs.filter(job => job.userId === userId);
        
        // Remove user's jobs
        const filteredJobs = jobs.filter(job => job.userId !== userId);
        localStorage.setItem('iitWorksServices', JSON.stringify(filteredJobs));
        
        // Remove user
        users.splice(userIndex, 1);
        localStorage.setItem('iitWorksUsers', JSON.stringify(users));
        
        return { 
            success: true, 
            message: 'User deleted successfully',
            userName: userToDelete.name,
            jobsDeleted: userJobs.length
        };
    },

    // Update user role (admin only)
    updateUserRole(userId, newRole) {
        if (!Auth.isAdmin()) {
            return { success: false, message: 'Admin access required' };
        }
        
        if (!['admin', 'user'].includes(newRole)) {
            return { success: false, message: 'Invalid role' };
        }
        
        const users = JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return { success: false, message: 'User not found' };
        }
        
        users[userIndex].role = newRole;
        localStorage.setItem('iitWorksUsers', JSON.stringify(users));
        
        return { 
            success: true, 
            message: `Role updated to ${newRole}`,
            userName: users[userIndex].name
        };
    },

    // Get statistics
    getStats() {
        const users = JSON.parse(localStorage.getItem('iitWorksUsers') || '[]');
        const jobs = JSON.parse(localStorage.getItem('iitWorksServices') || '[]');
        
        const totalUsers = users.length;
        const totalJobs = jobs.length;
        const activeUsers = users.filter(u => 
            jobs.some(job => job.userId === u.id)
        ).length;
        
        // Count jobs by category
        const jobsByCategory = {};
        jobs.forEach(job => {
            jobsByCategory[job.category] = (jobsByCategory[job.category] || 0) + 1;
        });
        
        return {
            totalUsers,
            totalJobs,
            activeUsers,
            jobsByCategory
        };
    }
};