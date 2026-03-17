


import 'dotenv/config'; 
import app from "./app.js";

// Fallback to 5000 if PORT is undefined
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database check: ${process.env.DATABASE_URL ? 'Connected' : 'Not Connected'}`);
});

