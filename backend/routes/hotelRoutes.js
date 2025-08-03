import express from "express";
import Hotel from "../models/Hotel.js"; // correct import

const router = express.Router();

//  Get all hotels
router.get("/", async (req, res) => {
  try {
    const hotels = await Hotel.find({});
    res.json(hotels);
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

//  Get one hotel by slug
router.get("/:slug", async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ slug: req.params.slug });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    res.json(hotel);
  } catch (error) {
    console.error("Error fetching hotel:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
