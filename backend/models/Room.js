import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  hotelSlug: String,      // e.g. "taj"
  hotelName: String,      // for easy query
  type: String,           // "Deluxe Room", "Suite", etc.
  price: Number,
  totalRooms: Number,
  bookedRooms: Number,
  amenities: [String],
});

export default mongoose.models.Room || mongoose.model("Room", RoomSchema);
