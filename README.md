# 🌾 KrishiLink Server - Backend for Farmer’s Growth & Connection Platform

---

## 🧩 1. Project Overview

**KrishiLink Server** is the backend API for the KrishiLink platform.  
It handles **user authentication, crop management, interest requests, and data storage** for farmers, traders, and consumers.

---

## 🌍 2. Live Site / API

🔗 **Live API Base URL:** [https://krishilink-server-three.vercel.app](https://krishilink-server-three.vercel.app)


🔗 **Live API Base URL:** (Add your live server URL here, e.g., `https://krishilink-server.vercel.app`)

---

## ✨ 3. Key Features

- 🔑 **User Authentication:** Register and login users securely using Firebase and JWT.  
- 🌱 **Crop Management:** CRUD operations for crops posted by farmers.  
- 💬 **Interest Requests:** Track and manage buyer/trader requests for crops.  
- 🗄️ **Database Integration:** MongoDB used for storing all users, crops, and interest data.  
- ⚡ **Fast & Lightweight:** Built with Node.js and Express.js for high performance.  
- 🛠️ **API Security:** Routes protected with authentication and role-based access.

---

## ⚙️ 4. Technologies Used

**Backend:** Node.js, Express.js  
**Database:** MongoDB  
**Authentication:** Firebase Authentication, Firebase Admin SDK
**Hosting / Deployment:** Vercel / Heroku / Any Node.js server  

---

## 🧠 5. Installation & Setup

To run the server locally:

```bash
# Clone the repository
git clone https://github.com/mdriyazakondo/Farmer-server-site.git

# Navigate to the project folder
cd Farmer-server-site

# Install dependencies
npm install

# Create a .env file and add your environment variables
# Example:
# PORT=5000
# MONGO_URI=your_mongodb_connection_string
# FIREBASE_ADMIN_SDK=your_firebase_service_account_json

# Run the server
npm start
