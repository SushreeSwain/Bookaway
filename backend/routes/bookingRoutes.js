import express from "express";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking (Login required)
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { hotelSlug, roomType, checkIn, checkOut, guests, roomsBooked, userName, email } = req.body;

    // Get logged-in user from token
    const bookingUser = await User.findById(req.user.id);
    if (!bookingUser) {
      return res.status(401).json({ message: "User not found or not logged in." });
    }

    // Check if provided username & email match logged-in user's details
    if (userName !== bookingUser.name || email !== bookingUser.email) {
      return res.status(403).json({ message: "Username and email must match the logged-in user." });
    }

    // 1. Validate fields
    if (!hotelSlug || !roomType || !checkIn || !checkOut || !guests || !roomsBooked) {
      return res.status(400).json({ message: "Missing required fields in request body" });
    }

    // 2. Date handling
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const oneYearFromToday = new Date(today);
    oneYearFromToday.setFullYear(today.getFullYear() + 1);

    if (checkInDate < tomorrow) {
      return res.status(400).json({ message: "Check-in date must be after today." });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: "Check-out date must be after check-in date." });
    }
    if (checkInDate > oneYearFromToday) {
      return res.status(400).json({ message: "Bookings can only be made up to 1 year in advance." });
    }

    // 3. Guest limit
    if (guests > roomsBooked * 3) {
      return res.status(400).json({
        message: `Guest limit exceeded. Max ${roomsBooked * 3} guests allowed for ${roomsBooked} room(s).`
      });
    }

    // 4. Find hotel
    const hotel = await Hotel.findOne({ slug: hotelSlug });
    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    // 5. Find room type
    const room = await Room.findOne({ hotelSlug, type: roomType });
    if (!room) {
      return res.status(404).json({ message: "Room type not found" });
    }

    // 6. Overlapping booking check
    const overlappingBookings = await Booking.aggregate([
      {
        $match: {
          hotelSlug,
          roomType,
          status: "confirmed",
          $or: [
            { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalBooked: { $sum: "$roomsBooked" }
        }
      }
    ]);

    const currentlyBooked = overlappingBookings.length > 0 ? overlappingBookings[0].totalBooked : 0;
    if (currentlyBooked + roomsBooked > room.totalRooms) {
      return res.status(400).json({ message: "Not enough rooms available for these dates." });
    }

    // 7. Update room count
    room.bookedRooms += roomsBooked;
    await room.save();

    // 8. Calculate price
    const totalPrice = room.price * roomsBooked;

    // 9. Save booking
    const newBooking = await Booking.create({
      hotelSlug,
      hotelName: hotel.name,
      roomType,
      userName,
      email,
      checkIn,
      checkOut,
      guests,
      roomsBooked,
      totalPrice,
      status: "confirmed",
      user: bookingUser._id
    });

    res.status(201).json({
      message: "Booking confirmed!",
      booking: newBooking
    });

  } catch (error) {
    console.error("Booking Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   DELETE /api/bookings/:bookingId
 * @desc    Cancel a booking (Login required)
 */
router.delete("/:bookingId", verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find booking for the logged-in user
    const booking = await Booking.findOne({ _id: bookingId, user: req.user.id });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found or unauthorized" });
    }

    // Restore room availability
    const room = await Room.findOne({ hotelSlug: booking.hotelSlug, type: booking.roomType });
    if (room) {
      room.bookedRooms = Math.max(0, room.bookedRooms - booking.roomsBooked);
      await room.save();
    }

    // Delete booking
    await Booking.deleteOne({ _id: bookingId });

    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/bookings/my-bookings?page=1&limit=5
 * @desc    Get all bookings of logged-in user with pagination (latest first)
 */
router.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    // Extract pagination params from query
    let { page = 1, limit = 5 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Count total bookings for the user
    const totalBookings = await Booking.countDocuments({ user: req.user.id });

    if (totalBookings === 0) {
      return res.status(404).json({ message: "No bookings found for this user" });
    }

    // Fetch bookings with pagination & latest first
    const bookings = await Booking.find({ user: req.user.id })
      .sort({ checkIn: -1 })         // latest check-in first
      .skip((page - 1) * limit)      // skip previous pages
      .limit(limit);                 // limit results per page

    res.json({
      totalBookings,
      currentPage: page,
      totalPages: Math.ceil(totalBookings / limit),
      bookings
    });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
