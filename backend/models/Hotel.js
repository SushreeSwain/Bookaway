import mongoose from "mongoose";

const HotelSchema = new mongoose.Schema({
  name: String,
  slug: String,
  location: String,
  tagline: String,
  description: String,
  startingPrice: Number,
  currency: String,
  amenities: [String],
  nearbyLocations: [String],
  images: [String],
});

export default mongoose.models.Hotel || mongoose.model("Hotel", HotelSchema);
