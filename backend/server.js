import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import "./cronJobs.js";

//  Routes
import hotelRoutes from "./routes/hotelRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

dotenv.config();
const app = express();

//  Middlewares
app.use(cors());
app.use(express.json());

//  API Routes
app.use("/api/hotels", hotelRoutes);
app.use("/api/bookings", bookingRoutes);

//  Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB Connection Error:", err));

//  Homepage route
app.get("/", (req, res) => {
  res.send("BookAway API is running...");
});


//  Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
