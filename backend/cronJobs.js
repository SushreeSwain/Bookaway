import cron from "node-cron";
import Booking from "./models/Booking.js";
import Room from "./models/Room.js";

console.log("Cron Jobs Initialized");

// Runs every day at midday (12:00)
cron.schedule("0 12 * * *", async () => {
  console.log("Running daily checkout task...");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // only date, no time

    // Find all bookings where checkOut date is today or before & still confirmed
    const expiredBookings = await Booking.find({
      checkOut: { $lte: today },
      status: "confirmed"
    });

    if (expiredBookings.length === 0) {
      console.log("No expired bookings today.");
      return;
    }

    console.log(`Found ${expiredBookings.length} bookings to expire.`);

    for (const booking of expiredBookings) {
      // Mark booking as expired
      booking.status = "expired";
      await booking.save();

      // Decrease room count in the Room collection
      const room = await Room.findOne({
        hotelSlug: booking.hotelSlug,
        type: booking.roomType
      });

      if (room) {
        room.bookedRooms = Math.max(0, room.bookedRooms - booking.roomsBooked);
        await room.save();
        console.log(`Room count updated for ${booking.roomType} at ${booking.hotelSlug}`);
      }
    }

    console.log("Checkout cron completed.");

  } catch (err) {
    console.error("Cron job error:", err);
  }
});
