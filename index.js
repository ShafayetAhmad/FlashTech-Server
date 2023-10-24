const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();
const ProductsData = require("./productsData");

// middleware
app.use(cors());
app.use(express.json());

const db_user = process.env.DB_USER;
const db_pass = process.env.DB_PASS;

const uri = `mongodb+srv://${db_user}:${db_pass}@cluster0.tv2lcpe.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const usersCollection = client.db("FlashTech").collection("users");
    const ProductsCollection = client.db("FlashTech").collection("products");
    const BrandsCollection = client.db("FlashTech").collection("brands");

    // mongodb query to insert mulitple product data from json directly to mongodb in one operation
    // const result = await ProductsCollection.insertMany(ProductsData);
    // console.log(`${result.insertedCount} products inserted successfully`);

    // route to handle POST requests for new user registration
    app.post("/addNewUser", async (req, res) => {
      const newUser = req.body;
      console.log(newUser);

      try {
        const result = await usersCollection.insertOne(newUser);

        res.status(201).json({
          message: "User added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding user to MongoDB:", error);

        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // route to handle adding new product with details
    app.post("/addNewProduct", async (req, res) => {
      const newProduct = req.body;
      console.log(newProduct);

      try {
        const result = await ProductsCollection.insertOne(newProduct);

        res.status(201).json({
          message: "Product added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding Product to MongoDB:", error);

        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // route to handle update product from proudct details page
    app.put("/updateProduct", async (req, res) => {
      console.log("hit updated product api");
      console.log(req.body);
      const { productId, updatedProduct } = req.body;
      try {
        const product = await ProductsCollection.findOne({
          _id: new ObjectId(productId),
        });
        console.log("product to update", product);

        for (const key in updatedProduct) {
          await ProductsCollection.updateOne(
            { _id: product._id },
            { $set: { [key]: updatedProduct[key] } }
          );
          console.log(
            `Updated ${key} in document with _id ${productId}to ${updatedProduct[key]}`
          );
        }
        const seeUpdatedProduct = await ProductsCollection.findOne({
          _id: new ObjectId(productId),
        });
        console.log("product updated: ", seeUpdatedProduct);
      } catch (error) {
        console.error("Error updating user cart:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    // route to insert new product into the card in users collection
    app.put("/updateUserCart", async (req, res) => {
      console.log(req.body);
      const { userEmail, currentProduct } = req.body;
      console.log("line 84", userEmail, currentProduct);
      try {
        const user = await usersCollection.findOne({
          userEmail: userEmail,
        });
        console.log("90", user);

        if (!user) {
          return res
            .status(404)
            .json({ success: false, message: "user not found" });
        }

        const result = await usersCollection.updateOne(
          { userEmail: userEmail },
          { $push: { userCart: currentProduct } }
        );

        if (result.modifiedCount === 1) {
          console.log("Product added to cart successfully");
          res.json({
            success: true,
            message: "Product added to cart successfully",
            userCart: currentProduct,
          });
        } else {
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
        }
      } catch (error) {
        console.error("Error updating user cart:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    // route to remove product from user profile
    app.put("/deleteCardData", async (req, res) => {
      console.log(req.body);
      const { userEmail, productId } = req.body;
      console.log("line 84", userEmail, productId);
      try {
        const user = await usersCollection.findOne({
          userEmail: userEmail,
        });

        const result = await usersCollection.updateOne(
          { userEmail: userEmail },
          {
            $pull: {
              userCart: { _id: productId },
            },
          }
        );

        if (result.modifiedCount === 1) {
          console.log("Product deleted successfully");
          res.json({
            success: true,
            message: "Product deleted successfully",
          });
        } else {
          res
            .status(500)
            .json({ success: false, message: "Internal server error" });
        }
      } catch (error) {
        console.error("Error updating user cart:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    // route to get all brands data
    app.get("/getBrandsData", async (req, res) => {
      const cursor = await BrandsCollection.find({}).toArray();
      res.send(cursor);
    });

    // route to get cart data from the database
    app.get("/getCartData", async (req, res) => {
      try {
        const userEmail = req.query.userEmail;
        const user = await usersCollection.findOne({ userEmail: userEmail });
        res.json(user.userCart);
      } catch (error) {
        console.error("Error fetching cart data:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }
    });

    // route to get product list with data filtered by brand
    app.get("/getProductByBrand", async (req, res) => {
      const brand = req.query.brand;
      const cursor = await ProductsCollection.find({
        BrandName: `${brand}`,
      }).toArray();
      res.send(cursor);
    });

    // route to get featured proudct
    app.get("/getFeaturedProducts", async (req, res) => {
      const cursor = await ProductsCollection.find({
        Featured: "true",
      }).toArray();
      console.log("featured products", cursor);
      res.send(cursor);
    });

    // route to get proudct details on the product details page
    app.get("/getProductDetails", async (req, res) => {
      const productId = req.query.id;

      try {
        const cursor = await ProductsCollection.findOne({
          _id: new ObjectId(productId),
        });

        res.send(cursor);
      } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // route to get user details
    app.get("/getUserDetails", async (req, res) => {
      const userMail = req.query.userEmail;
      console.log(userMail);

      try {
        const cursor = await usersCollection.findOne({
          userEmail: userMail,
        });

        console.log(cursor);
        res.send(cursor);
      } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // route to get userdetails by email
    app.post("/getUserByEmail", async (req, res) => {
      const email = req.body;
      console.log(email);

      try {
        const query = { userEmail: email };
        const result = await usersCollection.findOne(query);

        res.status(201).json({
          message: "User added successfully",
          user: result,
        });
      } catch (error) {
        console.error("Error adding user to MongoDB:", error);

        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensure that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("FlashTech Server Running");
});

app.listen(port, () => {
  console.log(`flashtech server running on ${port}`);
});
