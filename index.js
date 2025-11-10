const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = require("./krishilink-farmer-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.8mz1ydx.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("krishiLink-farmer");
    const userCollection = db.collection("users");
    const productCollection = db.collection("products");

    console.log("✅ Successfully connected to MongoDB!");

    // ---------------- PRODUCTS ----------------
    app.get("/products", async (req, res) => {
      try {
        const result = await productCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch products" });
      }
    });

    app.get("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await productCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch product" });
      }
    });

    app.post("/products", verifyToken, async (req, res) => {
      try {
        const newProduct = req.body;
        const productWithTime = {
          ...newProduct,
          created_at: new Date(),
        };
        const result = await productCollection.insertOne(productWithTime);
        res.send({ insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: "Failed to add product" });
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

        const result = await productCollection.updateOne(query, {
          $set: newUpdateData,
        });

        if (result.matchedCount === 0) {
          return res
            .status(403)
            .send({ message: "Not authorized or crop not found" });
        }

        res.send(result);
      } catch {
        res.status(500).send({ message: "Failed to update crop" });
      }
    });

    app.get("/latest-products", async (req, res) => {
      try {
        const result = await productCollection
          .find()
          .sort({ created_at: -1 })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch latest products" });
      }
    });

    app.delete("/products/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await productCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete product" });
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
        res.status(500).send({ message: "Failed to fetch posted crops" });
      }
    });

    app.get("/search", async (req, res) => {
      try {
        const search = req.query.search || "";
        const query = search ? { name: { $regex: search, $options: "i" } } : {};
        const result = await productCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to search crops" });
      }
    });

    app.post("/products/:id/interests", verifyToken, async (req, res) => {
      try {
        const cropId = req.params.id;
        const { userEmail, userName, quantity, message } = req.body;

        if (!quantity || quantity < 1) {
          return res
            .status(400)
            .send({ message: "Quantity must be at least 1" });
        }

        const crop = await productCollection.findOne({
          _id: new ObjectId(cropId),
        });

        if (!crop) return res.status(404).send({ message: "Crop not found" });
        if (crop.owner.ownerEmail === userEmail) {
          return res
            .status(403)
            .send({ message: "Owner cannot submit interest on own crop" });
        }

        const existing = crop.interests?.find((i) => i.userEmail === userEmail);
        if (existing) {
          return res
            .status(400)
            .send({ message: "You’ve already sent an interest" });
        }

        const newInterest = {
          _id: new ObjectId(),
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
      } catch (error) {
        res.status(500).send({ message: "Failed to submit interest" });
      }
    });

    app.patch(
      "/products/:cropId/interests/:interestId",
      verifyToken,
      async (req, res) => {
        try {
          const { cropId, interestId } = req.params;
          const { status } = req.body;

          const result = await productCollection.updateOne(
            {
              _id: new ObjectId(cropId),
              "interests._id": new ObjectId(interestId),
            },
            {
              $set: { "interests.$.status": status },
            }
          );

          if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Interest not found" });
          }

          res.send({ message: "Interest updated", result });
        } catch {
          res.status(500).send({ message: "Server error" });
        }
      }
    );

    app.get("/my-interests", verifyToken, async (req, res) => {
      try {
        const userEmail = req.query.userEmail;
        const crops = await productCollection
          .find({ "interests.userEmail": userEmail })
          .toArray();

        const interestCrops = crops.map((crop) => {
          const interest = crop.interests.find(
            (i) => i.userEmail === userEmail
          );
          return {
            cropId: crop._id,
            cropName: crop.name,
            interest,
          };
        });
        res.send(interestCrops);
      } catch {
        res.status(500).send({ message: "Failed to fetch interests" });
      }
    });
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
  }
}

run().catch(console.dir);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
