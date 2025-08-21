import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/users/me
 * @desc    Get logged-in user profile
 * @access  Private
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
