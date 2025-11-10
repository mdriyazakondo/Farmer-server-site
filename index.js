// -------------------------
// 🔹 Dependencies
// -------------------------
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// -------------------------
// 🔹 Middlewares
// -------------------------
app.use(cors());
app.use(express.json());

// -------------------------
// 🔹 Firebase Admin SDK Setup
// -------------------------
const serviceAccount = require("./krishilink-farmer-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// -------------------------
// 🔹 Token Verification Middleware
// -------------------------
const verifyToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ message: "Unauthorized: No token found" });
    }

    const token = authorization.split(" ")[1];
    if (!token) {
      return res.status(401).send({ message: "Unauthorized: Invalid token" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res
      .status(401)
      .send({ message: "Unauthorized access", error: error.message });
  }
};

// -------------------------
// 🔹 MongoDB Connection Setup
// -------------------------
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.8mz1ydx.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// -------------------------
// 🔹 Main Function
// -------------------------
async function run() {
  try {
    await client.connect();

    const db = client.db("krishiLink-farmer");
    const userCollection = db.collection("users");
    const productCollection = db.collection("products");

    // ✅ Ping test
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");

    // -------------------------
    // 👤 USER ROUTES
    // -------------------------

    app.get("/users", async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch users", error: error.message });
      }
    });

    app.get("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch user", error: error.message });
      }
    });

    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to add user", error: error.message });
      }
    });

    app.put("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateUser = req.body;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            name: updateUser.name,
            email: updateUser.email,
            photo: updateUser.photo,
          },
        };
        const result = await userCollection.updateOne(query, update);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to update user", error: error.message });
      }
    });

    app.delete("/users/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to delete user", error: error.message });
      }
    });

    // -------------------------
    // 🌾 PRODUCT ROUTES
    // -------------------------

    app.get("/products", async (req, res) => {
      try {
        const result = await productCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch products", error: error.message });
      }
    });

    app.get("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch product", error: error.message });
      }
    });

    app.post("/products", verifyToken, async (req, res) => {
      try {
        const newProduct = req.body;
        const result = await productCollection.insertOne(newProduct);
        res.send(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Failed to add product", error: error.message });
      }
    });

    app.put("/products/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const newUpdateData = req.body;

        const query = {
          _id: new ObjectId(id),
          "owner.ownerEmail": req.user.email,
        };

        const updateDoc = { $set: newUpdateData };
        const result = await productCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res
            .status(403)
            .send({ message: "Not authorized or crop not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating crop:", error);
        res.status(500).send({ message: "Failed to update crop" });
      }
    });

    app.get("/latest-products", async (req, res) => {
      const result = await productCollection
        .find()
        .sort({ created_at: "desc" })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.delete("/products/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to delete product", error: error.message });
      }
    });

    app.get("/my-posted", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const result = await productCollection
          .find({ "owner.ownerEmail": email })
          .toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to delete product", error: error.message });
      }
    });

    app.get("/search", async (req, res) => {
      try {
        const search = req.query.search || "";
        const query = search ? { name: { $regex: search, $options: "i" } } : {};
        const result = await productCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to fetch crops", error: error.message });
      }
    });

    app.post("/products/:id/interests", verifyToken, async (req, res) => {
      const cropId = req.params.id;
      const query = { _id: new ObjectId(cropId) };
      const { userEmail, userName, quantity, message } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).send({ message: "Quantity must be at least 1" });
      }

      const crop = await productCollection.findOne(query);
      if (!crop) return res.status(404).send({ message: "Crop not found" });
      if (crop.owner.ownerEmail === userEmail) {
        return res
          .status(403)
          .send({ message: "Owner cannot submit interest on their own crop" });
      }

      const existing = crop.interests.find((i) => i.userEmail === userEmail);
      if (existing) {
        return res
          .status(400)
          .send({ message: "You’ve already sent an interest" });
      }

      const interestsId = new ObjectId();
      const newInterest = {
        _id: interestsId,
        cropId: crop._id.toString(),
        userEmail,
        userName,
        quantity,
        message,
        status: "pending",
        createdAt: new Date(),
      };
      const result = await productCollection.updateOne(
        { _id: new ObjectId(cropId) },
        { $push: { interests: newInterest } }
      );
      res.send(result);
    });

    app.get("/products/:id/interests", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.get("/my-interests", verifyToken, async (req, res) => {
      const userEmail = req.query.userEmail;
      const crops = await productCollection
        .find({
          "interests.userEmail": userEmail,
        })
        .toArray();
      const interestCrops = crops.map((crop) => {
        const interest = crop.interests.find((i) => i.userEmail === userEmail);
        return {
          cropId: crop._id,
          cropName: crop.name,
          interest,
        };
      });
      res.send(interestCrops);
    });
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
  }
}

run().catch(console.dir);

// -------------------------
// 🔹 Server Listener
// -------------------------
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
