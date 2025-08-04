import express from "express";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("Incoming booking request:", req.body);

    const { hotelSlug, roomType, userName, email, checkIn, checkOut, guests, roomsBooked } = req.body;

    // Validate fields
    if (!hotelSlug || !roomType || !userName || !email || !checkIn || !checkOut || !guests || !roomsBooked) {
      return res.status(400).json({ message: "Missing required fields in request body" });
    }

    // Convert checkIn / checkOut to Date objects
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    const oneYearFromToday = new Date();
    oneYearFromToday.setFullYear(today.getFullYear() + 1);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Date validation
    if (checkInDate < tomorrow) {
      return res.status(400).json({ message: "Check-in date can only be after current day." });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: "Check-out date must be after check-in date." });
    }
    if (checkInDate > oneYearFromToday) {
      return res.status(400).json({ message: "You can only book up to 1 year in advance." });
    }

    // Guests check: 3 guests per room
    if (guests > roomsBooked * 3) {
      return res.status(400).json({ message: `Guest limit exceeded. Max ${roomsBooked * 3} guests allowed for ${roomsBooked} room(s).` });
    }

    // Find hotel
    const hotel = await Hotel.findOne({ slug: hotelSlug });
    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    // Find room type
    const room = await Room.findOne({ hotelSlug, type: roomType });
    if (!room) {
      return res.status(404).json({ message: "Room type not found" });
    }

    console.log(`Room found: ${room.type} | Booked: ${room.bookedRooms}/${room.totalRooms}`);

    // OVERLAP CHECK 
    const overlappingBookings = await Booking.aggregate([
      {
        $match: {
          hotelSlug, //bookings in same hotel
          roomType, //bookings in same room of same hotel
          status: "confirmed", //only count bookings that are already confirmed
          $or: [
            { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }  //booking starts before this user's checkout and booking ends after this user's check in
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

    if (currentlyBooked + roomsBooked > room.totalRooms) { //if 5 rooms are there and all 5 are booked with the same date and more users want the same room with the same dates, it will reject the booking
      return res.status(400).json({ message: "Not enough rooms available for these dates" }); 
    }

    // Update room count
    room.bookedRooms += roomsBooked;
    await room.save();

    // Calculate price
    const totalPrice = room.price * roomsBooked;

    // Save booking
    const newBooking = await Booking.create({
      hotelSlug,
      hotelName: hotel.name,
      roomType,
      userName: userName.trim(),
      email: email.trim(),
      checkIn,
      checkOut,
      guests,
      roomsBooked,
      totalPrice,
      status: "confirmed"
    });

    // Response
    res.status(201).json({
      message: "Booking confirmed!",
      booking: newBooking
    });

  } catch (error) {
    console.error("Booking Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// CANCEL BOOKING ROUTE (with debug logs)
router.delete("/:bookingId", async (req, res) => {
  try {
    console.log("Cancel Booking Request:", req.params.bookingId);
    console.log("Body received:", req.body);

    const { hotelSlug, roomType, roomsBooked } = req.body;

    // Find booking
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log("Booking in DB:", {
      hotelSlug: booking.hotelSlug,
      roomType: booking.roomType,
      roomsBooked: booking.roomsBooked,
    });

    console.log("Details sent by user:", { hotelSlug, roomType, roomsBooked });

    // Safety check make sure details match
    if (
      booking.hotelSlug !== hotelSlug ||
      booking.roomType !== roomType ||
      booking.roomsBooked !== roomsBooked
    ) {
      return res.status(400).json({ 
        message: "Booking details don't match. Cannot cancel." 
      });
    }

    //Decrease booked count
    const room = await Room.findOne({ hotelSlug, type: roomType });
    if (room) {
      room.bookedRooms -= roomsBooked;
      if (room.bookedRooms < 0) room.bookedRooms = 0;
      await room.save();
    }

    //Update status instead of deleting booking
    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
