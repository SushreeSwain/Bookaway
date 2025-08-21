import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
  hotelSlug: String,
  hotelName: String,
  roomType: String,
  userName: String,
  email: String,
  checkIn: Date,
  checkOut: Date,
  guests: Number,
  roomsBooked : Number,
  totalPrice: Number,
  status: { type: String, default: "confirmed" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
