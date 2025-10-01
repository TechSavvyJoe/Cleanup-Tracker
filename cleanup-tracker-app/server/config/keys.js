module.exports = {
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/cleanup-tracker',
    jwtSecret: process.env.JWT_SECRET || (() => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET must be set in production environment');
        }
        return 'dev-secret-change-in-production';
    })()
};
