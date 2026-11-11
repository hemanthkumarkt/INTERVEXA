const express = require("express");
const cors = require("cors");
require("dotenv").config();

const resumeRoute    = require("./routes/resume");
const aptitudeRoute  = require("./routes/aptitude");
const codingRoute    = require("./routes/coding");
const interviewRoute = require("./routes/interview");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
// app.use(express.json());
app.use(express.json({ limit: "5mb" }));

app.use("/api/resume",    resumeRoute);
app.use("/api/aptitude",  aptitudeRoute);
app.use("/api/coding",    codingRoute);
app.use("/api/interview", interviewRoute);

app.get("/", (req, res) => res.send("INTERVEXA Server Running ✅"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));