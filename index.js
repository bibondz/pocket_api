require('dotenv').config({ path: '.env.node' });

const app = require('./src/app');

// Start server
const PORT = process.env.LOCAL_APP_PORT || 5053;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
