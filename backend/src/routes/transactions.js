const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const filePath = path.join(__dirname, "../../data/transactions.json");

const categories = ["Food", "Travel", "Shopping", "Education", "Rent", "Health", "Entertainment", "Salary", "Scholarship", "Other"];

function readData() {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function checkData(data) {
  if (!data.title || data.title.length < 2) return "Title is required.";
  if (!data.amount || Number(data.amount) <= 0) return "Amount must be greater than zero.";
  if (data.type !== "income" && data.type !== "expense") return "Type must be income or expense.";
  if (!categories.includes(data.category)) return "Category is not valid.";
  if (!data.date) return "Date is required.";
  return "";
}

function filterData(data, query) {
  let result = data;

  if (query.type && query.type !== "all") {
    result = result.filter((item) => item.type === query.type);
  }

  if (query.category && query.category !== "all") {
    result = result.filter((item) => item.category === query.category);
  }

  if (query.search) {
    const text = query.search.toLowerCase();
    result = result.filter((item) => {
      return item.title.toLowerCase().includes(text) || item.category.toLowerCase().includes(text);
    });
  }

  return result;
}

function makeSummary(data) {
  let totalIncome = 0;
  let totalExpenses = 0;
  let categoryTotals = {};
  let monthlyData = {};

  data.forEach((item) => {
    const month = item.date.slice(0, 7);

    if (!monthlyData[month]) {
      monthlyData[month] = { month: month, income: 0, expenses: 0 };
    }

    if (item.type === "income") {
      totalIncome += item.amount;
      monthlyData[month].income += item.amount;
    } else {
      totalExpenses += item.amount;
      monthlyData[month].expenses += item.amount;
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    }
  });

  const categoryList = Object.entries(categoryTotals);
  categoryList.sort((a, b) => b[1] - a[1]);

  const monthlySeries = Object.values(monthlyData);
  monthlySeries.sort((a, b) => a.month.localeCompare(b.month));

  let trend = "Add more records.";
  const last = monthlySeries[monthlySeries.length - 1];
  const previous = monthlySeries[monthlySeries.length - 2];

  if (last && previous) {
    if (last.expenses > previous.expenses) trend = "Expenses increased this month.";
    if (last.expenses < previous.expenses) trend = "Expenses decreased this month.";
    if (last.expenses === previous.expenses) trend = "Expenses stayed the same.";
  }

  return {
    totalIncome: totalIncome,
    totalExpenses: totalExpenses,
    balance: totalIncome - totalExpenses,
    categoryTotals: categoryTotals,
    monthlySeries: monthlySeries,
    insights: {
      highestSpendingCategory: {
        category: categoryList[0] ? categoryList[0][0] : "None",
        amount: categoryList[0] ? categoryList[0][1] : 0
      },
      spendingTrend: trend
    }
  };
}

router.get("/categories", (req, res) => {
  res.json({ categories: categories });
});

router.get("/", (req, res) => {
  const data = readData();
  const result = filterData(data, req.query);
  res.json({ count: result.length, transactions: result });
});

router.get("/summary", (req, res) => {
  const data = readData();
  const result = filterData(data, req.query);
  res.json(makeSummary(result));
});

router.post("/", (req, res) => {
  const error = checkData(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const data = readData();
  const transaction = {
    _id: Date.now().toString(),
    title: req.body.title,
    amount: Number(req.body.amount),
    type: req.body.type,
    category: req.body.category,
    date: req.body.date,
    note: req.body.note || ""
  };

  data.push(transaction);
  writeData(data);
  res.status(201).json({ message: "Transaction added", transaction: transaction });
});

router.put("/:id", (req, res) => {
  const error = checkData(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const data = readData();
  const index = data.findIndex((item) => item._id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  data[index].title = req.body.title;
  data[index].amount = Number(req.body.amount);
  data[index].type = req.body.type;
  data[index].category = req.body.category;
  data[index].date = req.body.date;
  data[index].note = req.body.note || "";

  writeData(data);
  res.json({ message: "Transaction updated", transaction: data[index] });
});

router.delete("/:id", (req, res) => {
  const data = readData();
  const newData = data.filter((item) => item._id !== req.params.id);

  if (data.length === newData.length) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  writeData(newData);
  res.json({ message: "Transaction deleted" });
});

module.exports = router;
