import express from "express";
import Hotel from "../models/Hotel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      city,
      country,
      startingPrice,
      page = 1,
      limit = 10,
      name,
      type,
      sort,
    } = req.query;

    const filters = {};

    if (city) filters.city = new RegExp(`^${city}$`, "i"); // city filter
    if (country) filters.country = new RegExp(`^${country}$`, "i"); //country filter
    if (startingPrice)
      filters.startingPrice = { $lte: Number(startingPrice) }; // starting price filter
    if (name) filters.name = new RegExp(name, "i"); // partial match, case sensitive
    if (type) filters.type = new RegExp(type, "i"); //hotel type filter

    const skip = (Number(page) - 1) * Number(limit);

    // Sorting logic
    let sortOption = {};
    if (sort === "price_asc") sortOption.startingPrice = 1;
    else if (sort === "price_desc") sortOption.startingPrice = -1;
    else if (sort === "name_asc") sortOption.name = 1;
    else if (sort === "name_desc") sortOption.name = -1;

    const hotels = await Hotel.find(filters)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

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
