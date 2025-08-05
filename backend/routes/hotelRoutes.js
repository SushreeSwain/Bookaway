import express from "express";
import Hotel from "../models/Hotel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { city, country, maxPrice, page = 1, limit = 10 } = req.query;

    const filters = {};

    if (city) filters.city = new RegExp(`^${city}$`, "i"); // case-insensitive exact match
    if (country) filters.country = new RegExp(`^${country}$`, "i");
    if (maxPrice) filters.cheapestPrice = { $lte: Number(maxPrice) };

    const skip = (Number(page) - 1) * Number(limit);

    const hotels = await Hotel.find(filters).skip(skip).limit(Number(limit));

    const total = await Hotel.countDocuments(filters);

    res.status(200).json({
      hotels,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
