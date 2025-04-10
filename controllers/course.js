import TryCatch from "../middleware/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";
import { stripe } from "../index.js";

export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  res.json({ courses });
});

export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  res.json({ course });
});

export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });
  const user = await User.findById(req.user._id);

  if (user.role === "admin") return res.json({ lectures });

  if (!user.subscription.includes(req.params.id))
    return res.status(400).json({ message: "You have not subscribed to this course" });

  res.json({ lectures });
});

export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  const user = await User.findById(req.user._id);

  if (!lecture) return res.status(404).json({ message: "Lecture not found" });

  if (user.role === "admin") return res.json({ lecture });

  // 🔥 This was the issue: checking against wrong ID
  if (!user.subscription.includes(String(lecture.course))) {
    return res.status(400).json({ message: "You have not subscribed to this course" });
  }

  res.json({ lecture });
});


export const getMyCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find({ _id: req.user.subscription });
  res.json({ courses });
});

// Stripe Checkout (create PaymentIntent)
export const checkout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  const course = await Courses.findById(req.params.id);

  if (user.subscription.includes(course._id)) {
    return res.status(400).json({ message: "You already have this course" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.title,
              description: course.description,
            },
            unit_amount: course.price * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `http://localhost:5173/paymentsuccess/${course._id}`, // ✅ Redirect after payment
      cancel_url: `http://localhost:5173/course/${course._id}`, // 👈 Back to course if cancelled
      metadata: {
        userId: user._id.toString(),
        courseId: course._id.toString(),
      },
    });

    res.status(200).json({ id: session.id }); // ✅ this is what your frontend expects
  } catch (error) {
    console.error("Stripe Checkout Error:", error.message);
    res.status(500).json({ message: "Stripe checkout failed", error: error.message });
  }
});



// Payment Verification (using frontend confirmation)
export const paymentVerification = TryCatch(async (req, res) => {
  const { paymentId, userId, courseId } = req.body;

  const user = await User.findById(userId);
  const course = await Courses.findById(courseId);

  if (!user || !course) {
    return res.status(404).json({ message: "Invalid user or course" });
  }

  await Payment.create({
    stripe_payment_id: paymentId,
    stripe_customer_id: "NA", // Optional if available from frontend
    courseId,
    userId,
  });

  user.subscription.push(course._id);
  await user.save();

  res.status(200).json({ message: "Payment verified and course purchased" });
});


export const addProgress = TryCatch(async (req, res) => {
  const progress = await Progress.findOne({
    user: req.user._id,
    course: req.query.course,
  });

  const { lectureId } = req.query;

  if (progress.completedLectures.includes(lectureId)) {
    return res.json({
      message: "Progress recorded",
    });
  }

  progress.completedLectures.push(lectureId);

  await progress.save();

  res.status(201).json({
    message: "new Progress added",
  });
});

export const getYourProgress = TryCatch(async (req, res) => {
  const progress = await Progress.find({
    user: req.user._id,
    course: req.query.course,
  });

  if (!progress) return res.status(404).json({ message: "null" });

  const allLectures = (await Lecture.find({ course: req.query.course })).length;

  const completedLectures = progress[0].completedLectures.length;

  const courseProgressPercentage = (completedLectures * 100) / allLectures;

  res.json({
    courseProgressPercentage,
    completedLectures,
    allLectures,
    progress,
  });
});
