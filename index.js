import express from 'express'
import dotenv from "dotenv";
import {connectDb} from "./database/db.js";
import Stripe from 'stripe';
import cors from 'cors';


const app = express();


dotenv.config();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log("Stripe initialized:", stripe ? "✅" : "❌");


//using middlewares

app.use(express.json());

const port = process.env.PORT;

app.get('/', (req, res)=> {
    res.send("Server is running")
})


app.use(
  cors({
    origin: "https://elearn-phi.vercel.app/", 
    credentials: true, 
  })
);


app.use("/uploads", express.static("uploads"));

//importing routes
import userRoutes from './routes/user.js';
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";

//using routes
app.use('/api', userRoutes);
app.use('/api', courseRoutes);
app.use('/api', adminRoutes);


app.listen(port, ()=>{
    console.log(`server is running on ${port}`);
    connectDb()
})
