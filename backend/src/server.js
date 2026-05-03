const express = require("express");
const cors = require("cors");
const transactionRoutes = require("./routes/transactions");

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Student Expense Tracker API is working"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.use("/api/transactions", transactionRoutes);

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});
