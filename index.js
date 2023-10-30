const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true 
}));
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dtfuxds.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const logger =async(req, res, next)=>{
  console.log('called', req.host, req.originalUrl )
  next()
}

const verifyToken=async(req,res,next)=>{
  const token=req.cookies?.token;
  console.log('value of token in middle ware', token)
  if(!token){
    return res.status(401).send({message: 'not authorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    // error
    if(err){
      console.log(err)
      return res.status(401).send({message: 'unauthorized'})
    }
    // if token is valid then it would be decoded
    console.log('value in the token decoded', decoded)

    next()
  })
  
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db("carDoctor").collection("Services");
    const bookingsCollection = client.db("carDoctor").collection("bookings");

    // jwt 
    app.post('/jwt',logger, async(req,res)=>{
      const user= req.body; 
      console.log(user)
      const token= jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });

      res
      .cookie('token', token,{
        httpOnly:true, 
        secure:false,
        // sameSite:'none'
      })
      .send({success: true})
    })



    // service related
    app.get("/services",logger, async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    // Bookings
    app.get("/bookings",logger,verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log('token', req.cookies.token)
      console.log('user in the valid token',req.user) 
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/bookings/:id', async(req,res)=>{
      const id=req.params.id;
      const query={_id : new ObjectId(id)}
      const result=await bookingsCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/bookings/:id',async(req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)};
      const updateBooking=req.body;
      console.log(updateBooking)
      const updateDoc={
        $set:{
          status:updateBooking.status
        }
      }
      const result=await bookingsCollection.updateOne(filter,updateDoc);
      res.send(result)
    })

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Doctors server is running");
});
app.listen(port, () => {
  console.log(`car doctor server is running on port ${port}`);
});
