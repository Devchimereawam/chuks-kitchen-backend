const express = require('express');
const connectDB = require('./common/database');
const authRoutes = require('./authorization/routes');
const User = require('./common/models/User');

// Load Environment Variables
require('dotenv').config();

const app = express();

app.use(express.json());

app.get('/', (req, res) => res.send('Chuks Kitchen Backend API is running...'));

app.get('/status', (req, res) => {
    res.status(200).json({
        message: 'Chuks Backend Is Running',
        status: 'Running',
        version: 'v1',
        timestamp: new Date().toISOString()
    });
});

app.use('/auth', authRoutes);

// Connect using the enviroment port or default to 3000
const PORT = process.env.PORT || 3000;

// Wait for DB connection before listening or starting server
const startServer = async () => {
    await connectDB();
    await User.syncIndexes();
    app.listen(PORT, () => console.log(`Someone is listening on port ${PORT}`));
};

// Start only when run directly not at each instance when app is exported
if (require.main === module) {
    startServer();
}
   
// Handle errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong'
    });
});

// Export your app object
module.exports = app;
