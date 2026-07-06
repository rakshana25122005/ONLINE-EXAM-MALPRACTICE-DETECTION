const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "sathishchamp2004@gmail.com",
    pass: "abkj figz ngjt rmvi" // Gmail App Password
  }
});

// ---------------- GLOBAL STATE ----------------
let malpracticeCount = 0;
let mlProcess = null;
let testEnded = false;
let lastAlert = "";

// ---------------- ROUTES ----------------

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/home.html"));
});

app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Question page
app.get("/question", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/question.html"));
});

// Serve questions.json
app.get("/questions.json", (req, res) => {
  res.sendFile(path.join(__dirname, "../database/questions.json"));
});

// Start Test
app.get("/start-test", (req, res) => {
  malpracticeCount = 0;
  testEnded = false;
  lastAlert = "";

  // Spawn Python script
  const scriptPath = path.join(__dirname, "../ml_model/malpractice_detect.py");
mlProcess = spawn("python", [scriptPath], { stdio: "inherit" });

  res.json({ status: "Test Started" });
});

// End Test manually
app.get("/end-test", (req, res) => {
  if (mlProcess) {
    mlProcess.kill();
    mlProcess = null;
  }
  testEnded = true;
  res.json({ status: "Test Ended" });
});

// ---------------- STATUS ENDPOINT ----------------
app.get("/test-status", (req, res) => {
  res.json({
    message: lastAlert,
    count: malpracticeCount,
    ended: testEnded
  });
});

// ---------------- MALPRACTICE ALERT ----------------
app.post("/send-alert", (req, res) => {
  const { message, filename } = req.body;
  malpracticeCount++;
  lastAlert = message;

  // Full path to screenshot
  const screenshotPath = path.join(__dirname, "../ml_model", filename);
  console.log("Sending email with file:", screenshotPath);

  // Send email
  transporter.sendMail({
    from: "Exam Monitor <sathishchamp2004@gmail.com>",
    to: "janecharusha10@gmail.com",
    subject: "🚨 Malpractice Detected",
    text: message,
    attachments: [
      { filename: path.basename(filename), path: screenshotPath }
    ]
  }, (err, info) => {
    if (err) {
      console.error("Error sending email:", err);
      res.status(500).json({ status: "Error", error: err });
    } else {
      console.log("Email sent:", info.response);
      res.json({ status: "Email Sent", info });
    }
  });

  // Voice beep in terminal
  process.stdout.write("\x07");

  // Auto-end test after 3 detections
  if (malpracticeCount >= 3 && mlProcess) {
    mlProcess.kill();
    mlProcess = null;
    testEnded = true;
    console.log("Test ended automatically due to repeated malpractice!");
  }
});
// Start server
app.listen(3000, () => console.log("✅ Server running at http://127.0.0.1:3000"));