const express = require('express')
const app = express()

const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;


const cors = require('cors')
require('dotenv').config();

const { MongoClient } = require("mongodb");

const port = process.env.PORT||5000;


// Firebase Admin SDK
const serviceAccount = require("./eye-spy.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors())
app.use(express.json())

// connect to Sarver
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ed7sj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// Firebase Admin Verify
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];

      try {
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
      }
      catch {

      }

  }
  next();
}


async function run(){
  try{
    await client.connect()
    const usersCollection = client.db('eye_spy_DB').collection('users')
    const ordersCollection = client.db('eye_spy_DB').collection('orders')
    const productCollection = client.db('eye_spy_DB').collection('product')
    const reviewCollection = client.db('eye_spy_DB').collection('review')

/* =============================
            REVIEW PART START
    ===============================*/
    // post review
    app.post('/reviews',async(req,res)=>{
      const review = req.body;
      const result = await reviewCollection.insertOne(review)
      console.log(result);
      res.json(result)
    })

    // Get Review by email and Date
    app.get('/reviews',async(req,res)=>{
      const cursour = await reviewCollection.find({}).toArray();
      res.send(cursour)
    })

    /* =============================
            PRODUCT PART START
    ===============================*/
    // Add new product
    app.post('/products',async(req,res)=>{
      const product = req.body;
      const result = await productCollection.insertOne(product)
      console.log(result);
      res.json(result)
    })

    // Send Single product
    app.get("/product/:id", async (req, res) => {
      const result = await productCollection.findOne({_id:ObjectId(req.params.id)})
      res.send(result);
    });

    // Delete product
    app.delete("/products/:id", async (req, res) => {
      const result = await productCollection.deleteOne({_id:ObjectId(req.params.id)})
      res.send(result);
    });


    // Get orders by email and Date
    app.get('/products',async(req,res)=>{
      const cursour = await productCollection.find({}).toArray();
      res.send(cursour)
    })
    

    /* =============================
            ORDER PART START
    ===============================*/
    // post appointment
    app.post('/orders',async(req,res)=>{
      const appointment = req.body;
      const result = await ordersCollection.insertOne(appointment)
      res.json(result)
    })

    // Get all orders
    app.get('/orders',verifyToken,async(req,res)=>{
      const cursour = await ordersCollection.find({}).toArray();
      res.json(cursour)
    })

     // Delete order
     app.delete("/orders/:id", async (req, res) => {
      const result = await ordersCollection.deleteOne({_id:ObjectId(req.params.id)})
      res.send(result);
    });

    // Update Order Status
    app.put("/orders/:id",async(req,res)=>{
      const query = {_id:ObjectId(req.params.id)}
      const options = { upsert: true };
      const updateStatus = {
        $set: {
          status: "Shipped "
        },
      };
      const result = await ordersCollection.updateOne(query, updateStatus, options);
      res.send(result);
    })


    // Get orders by email
    app.get('/orders/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      const query = {email: email}
      const cursour = await ordersCollection.find(query).toArray();
      res.json(cursour)
    })

    /* =============================
            USER PART START
    ===============================*/
    // Post users 
    app.post('/users',async(req,res)=>{
      const user = req.body;
      const result = usersCollection.insertOne(user);
      res.json(result);
    })

    //Updat API
    app.put('/users',async(req,res)=>{
      const user = req.body;
      const filter = {email: user.email}
      const options = { upsert: true };
      const updateDoc = {
        $set:user
      }
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result)
    })


    // Update email as Admin
    app.put('/users/admin', verifyToken, async(req,res)=>{
      const user = req.body.email;
      const requester = req.decodedEmail; 
      if(requester){
        const requesterAccount =await usersCollection.findOne({email:requester })
        if(requesterAccount.role == 'admin'){
          const filter = {email:user}
          const updateDoc = {
            $set:{role:'admin'}
          }
          const result= await usersCollection.updateOne(filter,updateDoc)
          res.json(result)
        }
      }else{
        res.status(401).json({message:"You do not have access to make admin"})
      }
    })

    // Get one User Information(Check Admin or Not)
    app.get('/users/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      let isAdmin = false;
      if(user?.role == 'admin'){
        isAdmin = true;
      }
      res.json({admin: isAdmin})
      })
    }
  finally{
    // await client.close()
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('KalaChasma Web Sarver Running!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})