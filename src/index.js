require('dotenv').config({ path: '.env.node' });

const app = require('./app');
const fs = require('fs');
const path = require('path');

const PORT = 5053;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`PocketBase URL: ${process.env.PB_URL}`);
}); 